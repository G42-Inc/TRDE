#!/bin/bash

# Color Replacement Script: Green/Red → Teal/Coral
# For stats, graphs, and performance indicators only

echo "Starting color replacement: Green/Red → Teal/Coral"
echo "==============================================="

# Navigate to web src directory
cd "$(dirname "$0")/apps/web/src" || exit 1

# Function to replace colors in a file
replace_in_file() {
    local file=$1
    echo "Processing: $file"
    
    # Replace text-green-500 with inline teal color (for positive stats)
    sed -i.bak "s/text-green-500/style={{ color: '#14b8a6' }}/g" "$file"
    sed -i.bak "s/text-green-600/style={{ color: '#14b8a6' }}/g" "$file"
    sed -i.bak "s/text-green-700/style={{ color: '#14b8a6' }}/g" "$file"
    
    # Replace text-red-500 with inline coral color (for negative stats)
    sed -i.bak "s/text-red-500/style={{ color: '#f97316' }}/g" "$file"
    sed -i.bak "s/text-red-600/style={{ color: '#f97316' }}/g" "$file"
    sed -i.bak "s/text-red-700/style={{ color: '#f97316' }}/g" "$file"
    
    # Replace hex colors in charts
    sed -i.bak "s/#22c55e/#14b8a6/g" "$file"
    sed -i.bak "s/#16a34a/#14b8a6/g" "$file"
    sed -i.bak "s/#15803d/#0d9488/g" "$file"
    sed -i.bak "s/#10b981/#14b8a6/g" "$file"
    
    # Don't replace #ef4444 and #dc2626 in error/warning contexts
    # Only in stat/chart contexts - manual review needed
    
    # Remove backup files
    rm -f "${file}.bak"
}

# Target files for replacement (stats/graphs/performance indicators)
target_files=(
    "app/(app)/strategies/page.tsx"
    "components/widgets/QuickStatsWidget.tsx"
    "components/widgets/StrategyLeaderboardWidget.tsx"
    "components/widgets/RecentTradesWidget.tsx"
    "components/widgets/PnLSummaryWidget.tsx"
    "components/widgets/EquityCurveWidget.tsx"
    "app/(app)/flow/page.tsx"
    "app/edge/trades/page.tsx"
    "app/(app)/trades/[id]/page.tsx"
    "components/strategies/StrategyCard.tsx"
)

# Process each file
for file in "${target_files[@]}"; do
    if [ -f "$file" ]; then
        replace_in_file "$file"
    else
        echo "File not found: $file"
    fi
done

echo "==============================================="
echo "Color replacement complete!"
echo "Note: Manual review required for:"
echo "  - Error/warning contexts (should stay red)"
echo "  - Success messages (evaluate case-by-case)"
echo "  - Theme system files (lib/themes.ts, app/layout.tsx)"
