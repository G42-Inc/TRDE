'use client';

import { useState, useEffect } from 'react';
import { useAppData } from '@/hooks/useAppData';
import type { DailyBias, DailyQuickJournal } from '@trde/core';
import { EmotionLabel } from '@trde/core';
import { format, formatDistanceToNow } from 'date-fns';
import { XMarkIcon, PlusIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { sanitizeText } from '@/lib/security/sanitize';
import { capitalizeFirst } from '@/lib/utils/formatEnum';

export default function JournalPage() {
  const { dailyBiases: biases, quickJournals: journals, saveDailyBiases, saveQuickJournals, isLoading } = useAppData();
  const [mounted, setMounted] = useState(false);
  const [showBiasForm, setShowBiasForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedBiasIndex, setSelectedBiasIndex] = useState<number | null>(null);
  const [biasForm, setBiasForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    bias: 'neutral' as 'bullish' | 'bearish' | 'neutral', 
    reason: '', 
    confidence: 50 
  });
  const [journalForm, setJournalForm] = useState({ 
    moodLabel: EmotionLabel.NEUTRAL, 
    moodIntensity: 3,
    shortNote: '' 
  });
  const [confirmationForm, setConfirmationForm] = useState({
    confirmed: true,
    notes: '',
  });

  useEffect(() => {
    // Add a small delay to ensure skeleton loader is visible
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleSaveBias = async () => {
    if (!biasForm.date || !biasForm.reason.trim()) return;
    const newBias: DailyBias = {
      ...biasForm,
      confidence: biasForm.confidence,
    };
    const updated = [...biases, newBias];
    await saveDailyBiases(updated);
    setShowBiasForm(false);
    setBiasForm({ date: new Date().toISOString().split('T')[0], bias: 'neutral', reason: '', confidence: 50 });
  };

  const handleSaveJournal = async () => {
    if (!journalForm.shortNote.trim()) return;
    const newJournal: DailyQuickJournal = {
      timestamp: Date.now(),
      moodLabel: journalForm.moodLabel,
      moodIntensity: journalForm.moodIntensity,
      shortNote: journalForm.shortNote,
    };
    const updated = [...journals, newJournal];
    await saveQuickJournals(updated);
    setShowJournalForm(false);
    setJournalForm({ moodLabel: EmotionLabel.NEUTRAL, moodIntensity: 3, shortNote: '' });
  };

  const handleConfirmBias = (index: number) => {
    setSelectedBiasIndex(index);
    setConfirmationForm({ confirmed: true, notes: '' });
    setShowConfirmModal(true);
  };

  if (!mounted) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <SkeletonLoader width="150px" height="2rem" />
          <SkeletonLoader width="120px" height="2.5rem" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
            <SkeletonLoader width="120px" height="1.5rem" className="mb-4" />
            <SkeletonLoader width="100%" height="1rem" className="mb-2" />
            <SkeletonLoader width="80%" height="1rem" />
          </div>
          <div className="theme-bg-secondary p-6 rounded-xl border theme-border">
            <SkeletonLoader width="120px" height="1.5rem" className="mb-4" />
            <SkeletonLoader width="100%" height="1rem" className="mb-2" />
            <SkeletonLoader width="80%" height="1rem" />
          </div>
        </div>
      </div>
    );
  }

  const handleSaveConfirmation = async () => {
    if (selectedBiasIndex === null) return;
    
    const updated = [...biases];
    updated[selectedBiasIndex] = {
      ...updated[selectedBiasIndex],
      confirmed: confirmationForm.confirmed,
      confirmationNotes: confirmationForm.notes.trim() || undefined,
      confirmedAt: Date.now(),
    };
    
    await saveDailyBiases(updated);
    setShowConfirmModal(false);
    setSelectedBiasIndex(null);
    setConfirmationForm({ confirmed: true, notes: '' });
  };

  const sortedBiases = [...biases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const sortedJournals = [...journals].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold theme-text mb-2">Journal</h1>
          <p className="theme-text-secondary">Track your daily bias and quick thoughts</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBiasForm(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors font-medium shadow-sm"
          >
            <LightBulbIcon className="h-5 w-5" />
            <span>Daily Bias</span>
          </button>
          <button
            onClick={() => setShowJournalForm(true)}
            className="flex items-center space-x-2 px-4 py-2.5 theme-bg theme-text rounded-lg hover:opacity-90 transition-colors font-medium shadow-sm"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Quick Note</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Bias Section */}
        <div className="theme-bg-secondary p-6 rounded-xl border theme-border shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <LightBulbIcon className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-semibold theme-text">Daily Bias</h2>
            <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs font-medium">
              {sortedBiases.length}
            </span>
          </div>
          
          {sortedBiases.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 theme-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                <LightBulbIcon className="h-8 w-8 theme-text-tertiary" />
              </div>
              <p className="theme-text-secondary mb-2 font-medium">No daily biases yet</p>
              <p className="text-sm theme-text-tertiary mb-4">Start tracking your market outlook</p>
              <button
                onClick={() => setShowBiasForm(true)}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors text-sm font-medium"
              >
                Add Your First Bias
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedBiases.slice(0, 10).map((bias, idx) => {
                const actualIndex = biases.findIndex(b => b.date === bias.date && b.reason === bias.reason);
                const isConfirmed = bias.confirmed !== undefined;
                const isToday = bias.date === new Date().toISOString().split('T')[0];
                
                return (
                  <div 
                    key={idx} 
                    className={`p-5 rounded-lg border transition-all hover:shadow-md ${
                      isConfirmed 
                        ? bias.confirmed 
                          ? 'bg-positive/5 border-positive/20 dark:bg-positive/10' 
                          : 'bg-negative/5 border-negative/20 dark:bg-negative/10'
                        : 'theme-bg-tertiary theme-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 theme-text-tertiary" />
                        <span className={`text-sm font-medium ${
                          isToday ? 'text-accent font-semibold' : 'theme-text'
                        }`}>
                          {format(new Date(bias.date), 'MMM d, yyyy')}
                          {isToday && <span className="ml-1 text-xs">(Today)</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConfirmed && (
                          <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold ${
                            bias.confirmed 
                              ? 'bg-positive/20 text-positive border border-positive/30' 
                              : 'bg-negative/20 text-negative border border-negative/30'
                          }`}>
                            {bias.confirmed ? (
                              <CheckCircleIconSolid className="h-3.5 w-3.5" />
                            ) : (
                              <XCircleIcon className="h-3.5 w-3.5" />
                            )}
                            <span>{bias.confirmed ? 'Confirmed' : 'Incorrect'}</span>
                          </div>
                        )}
                        <span className={`px-3 py-1 rounded-md text-xs font-semibold ${
                          bias.bias === 'bullish' ? 'bg-positive/20 text-positive border border-positive/30' :
                          bias.bias === 'bearish' ? 'bg-negative/20 text-negative border border-negative/30' :
                          'theme-bg-tertiary theme-text border theme-border'
                        }`}>
                          {bias.bias.charAt(0).toUpperCase() + bias.bias.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm theme-text mb-3 leading-relaxed whitespace-pre-wrap">{sanitizeText(bias.reason)}</p>
                    
                    {bias.confirmationNotes && (
                      <div className="mb-3 p-3 theme-bg-tertiary rounded-md text-xs theme-text-secondary border-l-3 border-accent">
                        <span className="font-semibold theme-text">Confirmation: </span>
                        <span className="whitespace-pre-wrap">{sanitizeText(bias.confirmationNotes)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs theme-text-secondary font-medium">Confidence</span>
                      <div className="flex items-center space-x-2 flex-1 max-w-32">
                        <div className="flex-1 h-2 theme-bg-tertiary rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              bias.confidence >= 70 ? 'bg-positive' :
                              bias.confidence >= 40 ? 'bg-yellow-500' :
                              'bg-negative'
                            }`}
                            style={{ width: `${bias.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold theme-text w-10 text-right">
                          {bias.confidence}%
                        </span>
                      </div>
                    </div>
                    
                    {!isConfirmed && (
                      <button
                        onClick={() => handleConfirmBias(actualIndex)}
                        className="w-full mt-3 px-3 py-2 text-xs font-medium bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors border border-accent/20"
                      >
                        Mark as Confirmed/Incorrect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Journals Section */}
        <div className="theme-bg-secondary p-6 rounded-xl border theme-border shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <CalendarIcon className="h-6 w-6 text-purple-500" />
            <h2 className="text-xl font-semibold theme-text">Quick Notes</h2>
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded-full text-xs font-medium">
              {sortedJournals.length}
            </span>
          </div>
          
          {sortedJournals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 theme-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 theme-text-tertiary" />
              </div>
              <p className="theme-text-secondary mb-2 font-medium">No quick notes yet</p>
              <p className="text-sm theme-text-tertiary mb-4">Capture your thoughts quickly</p>
              <button
                onClick={() => setShowJournalForm(true)}
                className="px-4 py-2 theme-bg theme-text rounded-lg hover:opacity-90 transition-colors text-sm font-medium"
              >
                Add Your First Note
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedJournals.slice(0, 10).map((journal, idx) => {
                const journalDate = new Date(journal.timestamp);
                const isToday = format(journalDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                
                return (
                  <div 
                    key={idx} 
                    className="p-5 theme-bg-tertiary rounded-lg border theme-border hover:theme-bg-tertiary transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium ${
                          isToday ? 'text-accent font-semibold' : 'theme-text-secondary'
                        }`}>
                          {isToday ? 'Today' : format(journalDate, 'MMM d, yyyy')}
                        </span>
                        <span className="theme-text-tertiary">•</span>
                        <span className="text-xs theme-text-tertiary">
                          {formatDistanceToNow(journalDate, { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md text-xs font-medium border border-purple-500/20">
                          {capitalizeFirst(journal.moodLabel.replace(/_/g, ' '))}
                        </span>
                        {journal.moodIntensity && (
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  level <= journal.moodIntensity
                                    ? 'bg-purple-500'
                                    : 'theme-bg-tertiary'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm theme-text leading-relaxed whitespace-pre-wrap">
                      {sanitizeText(journal.shortNote)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Daily Bias Modal */}
      {showBiasForm && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowBiasForm(false)}
        >
          <div 
            className="theme-bg-secondary rounded-2xl shadow-2xl max-w-lg w-full border theme-border animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b theme-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <LightBulbIcon className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold theme-text">Daily Bias</h2>
                    <p className="text-xs theme-text-secondary">Set your market outlook for the day</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBiasForm(false)}
                  className="theme-text-secondary hover:theme-text transition-colors p-1 rounded-lg hover:theme-bg-tertiary"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-2">Date</label>
                  <input
                    type="date"
                    value={biasForm.date}
                    onChange={(e) => setBiasForm({ ...biasForm, date: e.target.value })}
                    className="w-full theme-bg-tertiary border theme-border theme-text rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-2">Bias</label>
                  <select
                    value={biasForm.bias}
                    onChange={(e) => setBiasForm({ ...biasForm, bias: e.target.value as any })}
                    className="w-full theme-bg-tertiary border theme-border theme-text rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="bullish">Bullish</option>
                    <option value="bearish">Bearish</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">Reason</label>
                <textarea
                  value={biasForm.reason}
                  onChange={(e) => setBiasForm({ ...biasForm, reason: e.target.value })}
                  className="w-full theme-bg-tertiary border theme-border theme-text rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Explain your market bias for this day..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium theme-text-secondary">Confidence</label>
                  <span className="text-lg font-semibold theme-text">{biasForm.confidence}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={biasForm.confidence}
                  onChange={(e) => setBiasForm({ ...biasForm, confidence: parseInt(e.target.value) })}
                  className="w-full h-2 theme-bg-tertiary rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs theme-text-tertiary mt-1">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleSaveBias}
                  disabled={!biasForm.date || !biasForm.reason.trim()}
                  className="flex-1 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Save Bias
                </button>
                <button
                  onClick={() => setShowBiasForm(false)}
                  className="flex-1 px-4 py-3 theme-bg-tertiary theme-text rounded-lg hover:theme-bg-tertiary font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Journal Modal */}
      {showJournalForm && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowJournalForm(false)}
        >
          <div 
            className="theme-bg-secondary rounded-2xl shadow-2xl max-w-lg w-full border theme-border animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b theme-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold theme-text">Quick Note</h2>
                    <p className="text-xs theme-text-secondary">Capture your thoughts quickly</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowJournalForm(false)}
                  className="theme-text-secondary hover:theme-text transition-colors p-1 rounded-lg hover:theme-bg-tertiary"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">Mood</label>
                <select
                  value={journalForm.moodLabel}
                  onChange={(e) => setJournalForm({ ...journalForm, moodLabel: e.target.value as EmotionLabel })}
                  className="w-full theme-bg-tertiary border theme-border theme-text rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {Object.values(EmotionLabel).map((emotion) => (
                    <option key={emotion} value={emotion}>
                      {emotion.replace(/_/g, ' ').toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium theme-text-secondary">Intensity</label>
                  <span className="text-sm font-semibold theme-text">{journalForm.moodIntensity}/5</span>
                </div>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setJournalForm({ ...journalForm, moodIntensity: level })}
                      className={`flex-1 h-10 rounded-lg border-2 transition-all ${
                        level <= journalForm.moodIntensity
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'theme-bg-tertiary theme-border theme-text-secondary hover:border-purple-500/50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">Note</label>
                <textarea
                  value={journalForm.shortNote}
                  onChange={(e) => setJournalForm({ ...journalForm, shortNote: e.target.value })}
                  className="w-full theme-bg-tertiary border theme-border theme-text rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={5}
                  placeholder="What's on your mind? Share your thoughts, observations, or reflections..."
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleSaveJournal}
                  disabled={!journalForm.shortNote.trim()}
                  className="flex-1 px-4 py-3 theme-bg theme-text rounded-lg hover:opacity-90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Save Note
                </button>
                <button
                  onClick={() => setShowJournalForm(false)}
                  className="flex-1 px-4 py-3 theme-bg-tertiary theme-text rounded-lg hover:theme-bg-tertiary font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bias Confirmation Modal */}
      {showConfirmModal && selectedBiasIndex !== null && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="theme-bg-secondary rounded-2xl shadow-2xl max-w-lg w-full border theme-border animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b theme-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold theme-text">Confirm Bias</h2>
                  <p className="text-xs theme-text-secondary mt-1">
                    Was your bias for {biases[selectedBiasIndex]?.date} correct?
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="theme-text-secondary hover:theme-text transition-colors p-1 rounded-lg hover:theme-bg-tertiary"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmationForm({ ...confirmationForm, confirmed: true })}
                  className={`flex-1 px-4 py-4 rounded-lg font-medium transition-all ${
                    confirmationForm.confirmed
                      ? 'bg-positive text-white shadow-lg scale-105'
                      : 'bg-positive/10 text-positive border-2 border-positive/30 hover:bg-positive/20'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span>Confirmed</span>
                  </div>
                </button>
                <button
                  onClick={() => setConfirmationForm({ ...confirmationForm, confirmed: false })}
                  className={`flex-1 px-4 py-4 rounded-lg font-medium transition-all ${
                    !confirmationForm.confirmed
                      ? 'bg-negative text-white shadow-lg scale-105'
                      : 'bg-negative/10 text-negative border-2 border-negative/30 hover:bg-negative/20'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <XCircleIcon className="h-5 w-5" />
                    <span>Incorrect</span>
                  </div>
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Notes {confirmationForm.confirmed ? '(Why was it correct?)' : '(Why was it incorrect?)'}
                </label>
                <textarea
                  value={confirmationForm.notes}
                  onChange={(e) => setConfirmationForm({ ...confirmationForm, notes: e.target.value })}
                  className="w-full theme-bg-tertiary border theme-border theme-text rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder={confirmationForm.confirmed ? "Explain why your bias was correct..." : "Explain why your bias was incorrect..."}
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleSaveConfirmation}
                  className="flex-1 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark font-medium transition-colors shadow-sm"
                >
                  Save Confirmation
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-3 theme-bg-tertiary theme-text rounded-lg hover:theme-bg-tertiary font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
