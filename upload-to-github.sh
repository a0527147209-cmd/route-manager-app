#!/bin/bash

# הוראות להעלאת הפרויקט ל-GitHub
# החלף YOUR_USERNAME בשם המשתמש שלך ב-GitHub
# החלף REPO_NAME בשם ה-repository שיצרת

cd "/Users/libi/Desktop/my app new"

# אתחל git
git init

# הוסף את כל הקבצים
git add .

# צור commit ראשון
git commit -m "Initial commit - Route Manager App"

# הוסף את ה-remote (החלף את YOUR_USERNAME ו-REPO_NAME!)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# הגדר את הסניף הראשי
git branch -M main

# העלה את הקוד
git push -u origin main

echo "✅ הקוד הועלה ל-GitHub בהצלחה!"
echo "עכשיו חזור ל-Vercel והדבק את הקישור: https://github.com/YOUR_USERNAME/REPO_NAME"
