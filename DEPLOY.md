# הוראות פרסום האתר לאינטרנט

האתר מוכן לפרסום! יש לך כמה אפשרויות:

## אפשרות 1: Vercel (הכי קל ומומלץ) 🚀

### דרך 1: דרך האתר (ללא GitHub)
1. היכנס ל-https://vercel.com והרשם (חינמי)
2. לחץ על "Add New Project"
3. לחץ על "Browse" או גרור את תיקיית `dist` (התיקייה שנוצרה אחרי build)
4. Vercel יפרסם את האתר אוטומטית
5. תקבל קישור כמו: `your-app-name.vercel.app`

### דרך 2: דרך GitHub (מומלץ לעדכונים עתידיים)
1. העלה את הפרויקט ל-GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. היכנס ל-https://vercel.com והרשם
3. לחץ על "Add New Project"
4. בחר את הפרויקט מ-GitHub
5. Vercel יזהה את Vite ויפרסם אוטומטית
6. כל עדכון ב-GitHub יתפרסם אוטומטית!

## אפשרות 2: Netlify 🌐

1. היכנס ל-https://netlify.com והרשם (חינמי)
2. לחץ על "Add new site" → "Deploy manually"
3. גרור את תיקיית `dist` לתיבה
4. תקבל קישור כמו: `your-app-name.netlify.app`

## אפשרות 3: GitHub Pages (חינמי)

1. העלה את הפרויקט ל-GitHub
2. ב-Settings → Pages
3. בחר את תיקיית `dist` כ-source
4. תקבל קישור כמו: `your-username.github.io/your-repo-name`

## עדכון האתר אחרי שינויים

אחרי כל שינוי בקוד:
1. הרץ: `npm run build`
2. אם השתמשת ב-Vercel דרך GitHub - פשוט תעשה push ל-GitHub והאתר יתעדכן אוטומטית
3. אם פרסמת ידנית - העלה מחדש את תיקיית `dist`

## הערות חשובות

- כל הנתונים נשמרים ב-localStorage של הדפדפן (לא בשרת)
- האתר יעבוד מכל מקום בעולם
- Vercel ו-Netlify מציעים SSL חינמי (https)
- הכל חינמי לחלוטין!
