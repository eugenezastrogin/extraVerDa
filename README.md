# extraVerDa
Server-side data parser + thin Svelte client for [Makeready](https://www.makeready.ru)

Since makeready no longer allows to fetch verifications for unlogged users you have to self-host dev version yourself
and provide verification html manually.

Steps:

1. git clone repository, cd into it
2. ```npm install``` in client (root) and server folders
3. Genarate bundle in public folder by running in client folder:
```npm run build```
4. Start local server:
```npm run start```
5. Open desired verification and save it in public folder as www.makeready.ru.html
6. Open localhost:4040, use as before

![](https://i.imgur.com/jYSXfZO.gif)
