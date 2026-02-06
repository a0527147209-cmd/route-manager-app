# הגדרת Auto-Commit אוטומטי ל-GitHub

הפרויקט כולל workflows של GitHub Actions שיריצו commit ו-push אוטומטית כשמתבצע deployment ב-Vercel או כשמתבצעים שינויים בקוד.

## Workflows שנוצרו

### 1. `auto-commit.yml`
- רץ כשמתבצע push ל-main
- רץ כשמתבצע deployment ב-Vercel (דרך webhook)
- רץ ידנית דרך GitHub Actions

### 2. `auto-sync.yml`
- רץ על כל push ל-main
- רץ על pull requests
- רץ כל יום ב-00:00 UTC (schedule)
- רץ ידנית

### 3. `vercel-webhook.yml`
- רץ כשמתבצע deployment ב-Vercel דרך webhook

## הגדרת Webhook ב-Vercel

כדי שהאוטומציה תעבוד כשמתבצע deployment ב-Vercel:

1. היכנס ל-Vercel Dashboard
2. בחר את הפרויקט שלך
3. לך ל-Settings → Git → Deploy Hooks
4. צור Deploy Hook חדש:
   - **Name**: `github-auto-commit`
   - **Branch**: `main`
5. העתק את ה-URL של ה-webhook

או:

1. לך ל-Settings → Integrations → GitHub
2. הפעל את ה-integration
3. ב-Settings → Git → Webhooks, הוסף webhook חדש:
   - **URL**: `https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/dispatches`
   - **Events**: בחר `deployment` ו-`deployment_status`
   - **Secret**: צור secret ב-GitHub Secrets

## הגדרת GitHub Secrets (אופציונלי)

אם אתה רוצה להשתמש ב-token מותאם אישית:

1. לך ל-GitHub Repository → Settings → Secrets and variables → Actions
2. לחץ על "New repository secret"
3. הוסף:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: Personal Access Token עם הרשאות `repo`

**הערה**: כברירת מחדל, GitHub Actions משתמש ב-`GITHUB_TOKEN` אוטומטית, אז זה לא חובה.

## שימוש מהיר

### דרך npm scripts:
```bash
# לעשות commit ו-push אוטומטית
npm run auto-commit

# לעשות build, commit ו-push
npm run deploy
```

### דרך סקריפט ישיר:
```bash
# לעשות commit עם הודעה ברירת מחדל
./auto-commit.sh

# לעשות commit עם הודעה מותאמת
./auto-commit.sh "fix: תיקון באג חשוב"
```

## איך זה עובד

1. **כשמתבצע push ל-GitHub**:
   - Workflow רץ אוטומטית
   - בונה את הפרויקט (`npm run build`)
   - בודק אם יש שינויים
   - אם יש שינויים, עושה commit ו-push

2. **כשמתבצע deployment ב-Vercel**:
   - Vercel שולח webhook ל-GitHub
   - Workflow רץ אוטומטית
   - עושה commit ו-push של השינויים

3. **כשרצים ידנית**:
   - לך ל-GitHub → Actions
   - בחר את ה-workflow הרצוי
   - לחץ על "Run workflow"

## בדיקה שהכל עובד

1. עשה שינוי קטן בקוד
2. עשה commit ו-push:
   ```bash
   git add .
   git commit -m "test: check auto-commit"
   git push
   ```
3. לך ל-GitHub → Actions
4. בדוק שה-workflow רץ בהצלחה
5. בדוק שה-commit האוטומטי נוצר

## הערות חשובות

- ה-workflows משתמשים ב-`[skip ci]` כדי למנוע לולאות אינסופיות
- ה-workflows לא יעשו commit אם אין שינויים
- ה-workflows דורשים הרשאות `contents: write` (כבר מוגדר)

## פתרון בעיות

### ה-workflow לא רץ
- בדוק שה-repository מחובר ל-GitHub Actions
- בדוק שה-workflows נמצאים ב-`.github/workflows/`
- בדוק שה-branch הוא `main` (או שנה ב-workflow)

### ה-workflow רץ אבל לא עושה commit
- בדוק שה-workflow יש לו הרשאות `contents: write`
- בדוק שאין שגיאות ב-logs
- בדוק שה-GitHub Token תקין

### לולאה אינסופית של commits
- ה-workflows משתמשים ב-`[skip ci]` כדי למנוע את זה
- אם זה קורה, בדוק שה-`[skip ci]` נמצא ב-commit message
