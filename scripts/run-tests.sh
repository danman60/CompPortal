#!/bin/bash
# Run Playwright Tests for CompPortal MAAD System
# Executes end-to-end tests and reports results

echo "🧪 Running Playwright tests for CompPortal..."
echo ""

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js"
    exit 1
fi

# Check if playwright is installed
if ! npx playwright --version &> /dev/null; then
    echo "📦 Playwright not found. Installing..."
    npx playwright install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Playwright"
        exit 1
    fi
    echo "✅ Playwright installed"
    echo ""
fi

# Parse test type argument
TEST_TYPE="${1:-full}"

case "$TEST_TYPE" in
  smoke)
    echo "🔥 Running smoke tests (5 minutes)..."
    npx playwright test --grep "@smoke" --reporter=list
    ;;
  regression)
    echo "🔄 Running regression suite (20 minutes)..."
    npx playwright test --grep "@regression" --reporter=list
    ;;
  full)
    echo "🎯 Running full test suite (60 minutes)..."
    npx playwright test --reporter=list
    ;;
  *)
    echo "❌ Invalid test type: $TEST_TYPE"
    echo "Usage: ./run-tests.sh [smoke|regression|full]"
    exit 1
    ;;
esac

TEST_EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!"
    echo ""
    echo "Test Results:"
    echo "  - Status: PASSED"
    echo "  - Exit Code: 0"
    echo "  - Type: $TEST_TYPE"
    echo ""
    echo "Next steps:"
    echo "  - Continue with feature development"
    echo "  - Check logs/TEST_LOG.md for details"
else
    echo "❌ Some tests failed"
    echo ""
    echo "Test Results:"
    echo "  - Status: FAILED"
    echo "  - Exit Code: $TEST_EXIT_CODE"
    echo "  - Type: $TEST_TYPE"
    echo ""
    echo "Next steps:"
    echo "  1. Review test output above"
    echo "  2. Check logs/ERROR_LOG.md for details"
    echo "  3. Assign bugs to relevant agents"
    echo "  4. Fix failures before continuing"
    echo "  5. Re-run tests to verify fixes"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $TEST_EXIT_CODE
