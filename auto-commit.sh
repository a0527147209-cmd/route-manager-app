#!/bin/bash

# סקריפט לעשות commit ו-push אוטומטית
# שימוש: ./auto-commit.sh [commit message]

cd "/Users/libi/Desktop/my app new"

# בדוק אם יש שינויים
if git diff-index --quiet HEAD --; then
    echo "✅ אין שינויים לעשות commit"
    exit 0
fi

# הוסף את כל השינויים
git add -A

# הודעה ל-commit
COMMIT_MSG="${1:-chore: auto-commit changes [skip ci]}"

# עשה commit
git commit -m "$COMMIT_MSG"

# Push ל-GitHub
git push origin main

echo "✅ השינויים הועלו ל-GitHub בהצלחה!"
