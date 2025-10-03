#!/bin/bash
# Auto-Cleanup Script for CompPortal MAAD System
# Runs quick cleanup tasks to remove garbage files and report code smells

echo "🧹 Starting auto-cleanup for CompPortal..."
echo ""

# Remove OS junk files
echo "📁 Removing OS junk files..."
find . -name ".DS_Store" -type f -delete 2>/dev/null
find . -name "Thumbs.db" -type f -delete 2>/dev/null
find . -name "desktop.ini" -type f -delete 2>/dev/null
echo "✅ OS junk files removed"
echo ""

# Remove backup files
echo "📁 Removing backup files..."
find . -name "*.bak" -type f -delete 2>/dev/null
find . -name "*.old" -type f -delete 2>/dev/null
find . -name "*-backup.*" -type f -delete 2>/dev/null
find . -name "*-copy.*" -type f -delete 2>/dev/null
echo "✅ Backup files removed"
echo ""

# Remove editor temp files
echo "📁 Removing editor temp files..."
find . -name "*~" -type f -delete 2>/dev/null
find . -name "*.swp" -type f -delete 2>/dev/null
find . -name "*.swo" -type f -delete 2>/dev/null
echo "✅ Editor temp files removed"
echo ""

# Remove empty directories (excluding node_modules, .git)
echo "📁 Removing empty directories..."
find . -type d -empty -not -path "*/node_modules/*" -not -path "*/.git/*" -delete 2>/dev/null
echo "✅ Empty directories removed"
echo ""

# Report findings (don't auto-delete, just report)
echo "🔍 Code Quality Report:"
echo ""

# Check for console.log usage
echo "📊 Console.log usage:"
CONSOLE_LOGS=$(grep -r "console\.log" src/ 2>/dev/null | wc -l)
if [ "$CONSOLE_LOGS" -gt 0 ]; then
  echo "   Found $CONSOLE_LOGS console.log statements"
  echo "   Files:"
  grep -r "console\.log" src/ 2>/dev/null | cut -d: -f1 | sort -u | head -5
  if [ "$CONSOLE_LOGS" -gt 5 ]; then
    echo "   ... and $((CONSOLE_LOGS - 5)) more"
  fi
else
  echo "   ✅ No console.log statements found"
fi
echo ""

# Check for TypeScript 'any' usage
echo "📊 TypeScript 'any' usage:"
ANY_COUNT=$(grep -r ": any" src/ 2>/dev/null | wc -l)
if [ "$ANY_COUNT" -gt 0 ]; then
  echo "   Found $ANY_COUNT uses of 'any' type"
  echo "   Consider adding proper types"
else
  echo "   ✅ No 'any' types found"
fi
echo ""

# Check for TODO comments
echo "📊 TODO comments:"
TODO_COUNT=$(grep -r "TODO:" src/ 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
  echo "   Found $TODO_COUNT TODO comments"
  grep -r "TODO:" src/ 2>/dev/null | head -3
  if [ "$TODO_COUNT" -gt 3 ]; then
    echo "   ... and $((TODO_COUNT - 3)) more"
  fi
else
  echo "   ✅ No TODO comments found"
fi
echo ""

# Check for commented code blocks (lines starting with //)
echo "📊 Commented code:"
COMMENTED_LINES=$(grep -r "^[[:space:]]*\/\/" src/ 2>/dev/null | wc -l)
if [ "$COMMENTED_LINES" -gt 0 ]; then
  echo "   Found $COMMENTED_LINES commented lines"
  echo "   Consider removing old commented code"
else
  echo "   ✅ No commented code found"
fi
echo ""

# Check for large files (>500 lines)
echo "📊 Large files (>500 lines):"
LARGE_FILES=$(find src/ -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l 2>/dev/null | sort -rn | awk '$1 > 500 {print}' | head -5)
if [ -n "$LARGE_FILES" ]; then
  echo "$LARGE_FILES"
  echo "   Consider breaking up large files"
else
  echo "   ✅ No excessively large files found"
fi
echo ""

echo "✅ Auto-cleanup complete!"
echo ""
echo "Next steps:"
echo "  - Review code quality report above"
echo "  - Run cleanup-agent for deeper refactoring"
echo "  - Run npm run build to verify everything works"
