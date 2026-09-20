\# Last Man Standing — Project Status



\## 1. Project Overview



I am building a football Last Man Standing game using Next.js and Supabase.



Players pick a football team each week. If their team loses, they are eliminated. If their team wins, they continue to the next week.



\## 2. Technology



\* Frontend: Next.js

\* Database and backend: Supabase

\* Football fixtures and results: Football Data API

\* Development environment: Windows, running locally at localhost:3000



\## 3. Game Rules



\* A losing team means the player is eliminated.

\* A draw means the player is eliminated.

\* A postponed match means the player gets another pick.

\* Missing the pick deadline means automatic elimination.

\* Players cannot pick the same team more than once in a competition.



\## 4. Current Features



\* Players can join competitions.

\* Players can submit football picks.

\* Picks are saved in Supabase.

\* The app has competition, league, players, picks and results screens.

\* The app uses a Supabase make\_pick RPC for secure pick submission.



\## 5. Current Status



The app has been working after recent fixes, but further testing and troubleshooting may be needed.



Do not assume every feature is fully tested.



\## 6. Important Existing Files



\* app/pick/page.tsx

\* app/league/

\* app/players/

\* app/results/

\* app/process-results/

\* utils/supabase/client.ts



Inspect the actual project before making changes.



\## 7. Known Issues



Add any new bugs, errors or problems here.



Do not invent problems or assume they are fixed without testing.



\## 8. Recent Changes



Record each change made, including:



\* Date

\* File changed

\* What was changed

\* Whether it was tested

\* Whether it worked



\## 9. Next Task



Write the next specific task here before asking an AI to make changes.



\## 10. Instructions for ChatGPT, Claude and Grok



\* Always inspect the existing code before making changes.

\* Do not rebuild the app from scratch.

\* Preserve the existing UI and working features.

\* Make small, focused changes.

\* Do not overwrite files unnecessarily.

\* Explain which files need changing and why.

\* Provide complete replacement code when requested.

\* Provide exact SQL migrations when database changes are required.

\* Never expose Supabase service-role keys, passwords or secrets.

\* Do not claim code has been tested unless it actually has.

\* Update this document after completing a task.



\## 11. Handover to the Next AI



Before finishing a task, provide:



1\. What was changed.

2\. Which files were changed.

3\. What remains unfinished.

4\. Any errors or risks discovered.

5\. How to test the changes.

6\. The next recommended task.



The next AI must read this document and inspect the relevant current files before continuing.



