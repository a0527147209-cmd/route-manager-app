# הוראות להעלאת הפרויקט ל-GitHub ואז פרסום ב-Vercel

## שלב 1: יצירת Repository ב-GitHub

1. היכנס ל-https://github.com והתחבר
2. לחץ על הכפתור הירוק "New" (או היכנס ל-https://github.com/new)
3. מלא:
   - **Repository name**: `route-manager-app` (או כל שם שתרצה)
   - **Description**: "Vending Route Manager App"
   - בחר **Public** או **Private** (השני חינמי)
   - **אל תסמן** "Initialize with README" (כי יש לנו כבר קבצים)
4. לחץ על "Create repository"

## שלב 2: העלאת הקוד ל-GitHub

פתח Terminal בתיקיית הפרויקט והרץ את הפקודות הבאות:

```bash
cd "/Users/libi/Desktop/my app new"

# אתחל git repository
git init

# הוסף את כל הקבצים
git add .

# צור commit ראשון
git commit -m "Initial commit - Route Manager App"

# הוסף את ה-remote של GitHub (החלף YOUR_USERNAME בשם המשתמש שלך)
git remote add origin https://github.com/YOUR_USERNAME/route-manager-app.git

# העלה את הקוד
git branch -M main
git push -u origin main
```

**חשוב:** החלף את `YOUR_USERNAME` בשם המשתמש שלך ב-GitHub, ואת `route-manager-app` בשם ה-repository שיצרת.

## שלב 3: חיבור ל-Vercel

1. היכנס ל-https://vercel.com והתחבר (אפשר עם GitHub)
2. לחץ על "Add New Project"
3. בחר את ה-repository שיצרת (`route-manager-app`)
4. Vercel יזהה את Vite אוטומטית
5. לחץ על "Deploy"
6. אחרי כמה שניות תקבל קישור כמו: `route-manager-app.vercel.app`

## עדכונים עתידיים

כל פעם שתרצה לעדכן את האתר:
1. עשה שינויים בקוד
2. הרץ: `npm run build`
3. ב-Terminal:
   ```bash
   git add .
   git commit -m "Update: description of changes"
   git push
   ```
4. Vercel יעדכן את האתר אוטומטית תוך דקות!

---

## אלטרנטיבה: פרסום ישיר בלי GitHub

אם אתה מעדיף לא להשתמש ב-GitHub:

1. היכנס ל-https://vercel.com
2. לחץ על "Add New Project"
3. לחץ על "Browse" או גרור את תיקיית `dist` מהפרויקט
4. תקבל קישור מיד!

**הערה:** עם GitHub, כל עדכון יתפרסם אוטומטית. בלי GitHub, תצטרך להעלות מחדש את `dist` בכל פעם.
