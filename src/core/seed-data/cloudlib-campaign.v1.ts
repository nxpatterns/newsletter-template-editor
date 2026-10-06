import type { Newsletter } from '../types';

/** Full previously-sent CloudLib campaign seed (demo config). */
export const CLOUDLIB_CAMPAIGN_V1 = {
  "schemaVersion": 1,
  "globals": {
    "preheader": "Ihre Kunden sind nicht naiv. Sie vergleichen. Schnell. Still. Und meistens ohne zweite Chance. \n\nWas sieht jemand, der Ihren Betrieb online findet? Ein Logo, eine Adresse – oder Ihren Betrieb, betretbar in 3D?\n\n22.000 Unternehmen in neun Ländern haben das bereits geändert – mit 3D-Rundgängen, die man direkt über Google und Social Media betreten kann.",
    "fontFamily": "Georgia",
    "accentColor": "#7ecfff",
    "goldColor": "#f5c518",
    "bodyTextColor": "#7a9ab8",
    "headingColor": "#d8eeff",
    "campaignSubject": "Wie betritt man Ihren Betrieb, wenn die Tür geschlossen ist?",
    "pageBgColor": "#08101e",
    "contentBgColor": "#0c1628",
    "logo": {
      "src": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjEuNjk2IDk5Ljg2MiIgeG1sbnM6Yng9Imh0dHBzOi8vYm94eS1zdmcuY29tIj4KICA8ZGVmcz4KICAgIDxyYWRpYWxHcmFkaWVudCBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgY3g9IjM1LjQyOCIgY3k9Ijc5LjE3OCIgcj0iMjcuMDM0IiBpZD0iZ3JhZGllbnQtMSIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgwLjczNTk4NCwgLTAuNDc2MzA4LCAwLjY5MTY1MywgMC41MjMzNTUsIC0zMy42MjU4ODUsIDYwLjIwNjQ4OCkiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiByZ2IoMCwgMTM0LCAyMDEpOyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiByZ2IoMjMyLCAyNDYsIDI1NCk7Ii8+CiAgICA8L3JhZGlhbEdyYWRpZW50PgogICAgPHJhZGlhbEdyYWRpZW50IGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBjeD0iNDkuMTM5IiBjeT0iODEuNTk3IiByPSIxOC4yNjYiIGlkPSJncmFkaWVudC0zIiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDAuNDYxMTksIDEuNjI3MjQsIC0xLjA1MTcxOCwgMC41NTc5NjEsIDEwMi4zMTQ5MTEsIC01Mi44MDIwOTUpIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwIiBzdHlsZT0ic3RvcC1jb2xvcjogcmdiKDEwOCwgMTQ2LCAyNTQpOyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjAuODUyIiBzdHlsZT0ic3RvcC1jb2xvcjogcmdiKDE2OSwgMjE3LCAyNTUpOyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiByZ2IoMTU5LCAyMjgsIDI0OCk7Ii8+CiAgICA8L3JhZGlhbEdyYWRpZW50PgogICAgPHJhZGlhbEdyYWRpZW50IGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBjeD0iNDkuMTM5IiBjeT0iODEuNTk3IiByPSIxOC4yNjYiIGlkPSJncmFkaWVudC0yIiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEuNTM2NTA0LCAwLjkwNDEyNywgLTAuMzUxODM0LCAxLjA3NDI3MiwgMTYuNjgwOTI4LCAtNTYuMjg4OTE1KSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IHJnYigwLCAxMzksIDE4Nik7Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMC44NTIiIHN0eWxlPSJzdG9wLWNvbG9yOiByZ2IoMTY5LCAyMTcsIDI1NSk7Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6IHJnYigxNTksIDIyOCwgMjQ4KTsiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8Yng6ZXhwb3J0PgogICAgICA8Yng6ZmlsZSBmb3JtYXQ9InBuZyIgcGF0aD0ibG9nby1jbG91ZGxpYi1ldS1taW4tZGFyay1iZy5wbmciIGRwaT0iMTIwIiB3aWR0aD0iNTg0IiBoZWlnaHQ9IjQ4MCIvPgogICAgICA8Yng6ZmlsZSBmb3JtYXQ9InBuZyIgaHJlZj0iI29iamVjdC0wIiBwYXRoPSJsb2dvLWNsb3VkbGliLWV1LW1pbi1kYXJrLWJnLnBuZyIgd2lkdGg9IjQ4MCIgaGVpZ2h0PSI0ODAiLz4KICAgIDwvYng6ZXhwb3J0PgogICAgPHJhZGlhbEdyYWRpZW50IGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBjeD0iMzQuOTQ3IiBjeT0iMzEuOTA3IiByPSIyOC45NSIgaWQ9ImdyYWRpZW50LTAiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMi4zMDg0MzcsIDAuMDQ2MzA5LCAtMC4wMjAwNTcsIDAuOTk5Nzk5LCAtMjIuMTg3MzU3LCA5LjMwNjc4NSkiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiByZ2IoMTUsIDU2LCAxMDApOyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjAuNjMxIiBzdHlsZT0ic3RvcC1jb2xvcjogcmdiKDcsIDU0LCAxNDgpOyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiByZ2IoNDIsIDkyLCAyMzgpOyIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICA8L2RlZnM+CiAgPHN0eWxlIHR5cGU9InRleHQvY3NzIj4uY2xzLTAge2ZpbGw6IzA0MTIyODt9Ci5jbHMtMSB7ZmlsbDp1cmwoI1NWR0lEXzFfKTt9Ci5jbHMtMiB7ZmlsbDojMDQyNDUwO30KLmNscy0zIHtmaWxsOiMwMTBFMjE7fQouY2xzLTQge2ZpbGw6IzAyMTIyOTt9Ci5jbHMtNSB7ZmlsbDojMDUzMzZGO30KLmNscy02IHtmaWxsOnVybCgjU1ZHSURfMl8pO30KLmNscy03IHtmaWxsOiMwMTExMjg7fQouY2xzLTgge2ZpbGw6dXJsKCNTVkdJRF8zXyk7fQouY2xzLTkge2ZpbGw6bm9uZTtzdHJva2U6IzA1NUVBODtzdHJva2Utd2lkdGg6MC43NDQ0O3N0cm9rZS1taXRlcmxpbWl0OjEwO30KLmNscy0xMCB7ZmlsbDpub25lO3N0cm9rZTojMTVBM0U4O3N0cm9rZS13aWR0aDowLjQ5NjM7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fQouY2xzLTExIHtmaWxsOnVybCgjU1ZHSURfNF8pO30KLmNscy0xMiB7ZmlsbDojMDU2OUEwO30KLmNscy0xMyB7ZmlsbDojMDQ0NTZGO30KLmNscy0xNCB7ZmlsbDp1cmwoI1NWR0lEXzVfKTt9Ci5jbHMtMTUge2ZpbGw6IzFFMzU1NTt9Ci5jbHMtMTYge2ZpbGw6dXJsKCNTVkdJRF82Xyk7fQouY2xzLTE3IHtmaWxsOiNGRkZGRkY7fQouY2xzLTE4IHtmaWxsOnVybCgjU1ZHSURfN18pO30KLmNscy0xOSB7ZmlsbDp1cmwoI1NWR0lEXzhfKTt9Ci5jbHMtMjAge2ZpbGw6dXJsKCNTVkdJRF85Xyk7fTwvc3R5bGU+CiAgPHBhdGggY2xhc3M9ImNscy03IiBkPSJNIDg4Ljg0NyA0My4yMzUgQyA4OC44NDcgNTguNjM1IDc2LjMyOSA2OC4xNDMgNjAuMTI5IDY4LjE0MyBDIDQ0LjYyOSA2OC4xNDMgMzAuNzU0IDU5Ljk1NCAzMC43NTQgNDMuMDU0IEMgMzAuNzU0IDI5LjM1NCA0My40NDcgMTIuODM1IDYwLjA0NyAxMi44MzUgQyA3My44NDcgMTIuODM1IDg4Ljg0NyAyNC40MzUgODguODQ3IDQzLjIzNSBaIiBzdHlsZT0iZmlsbDogdXJsKCZxdW90OyNncmFkaWVudC0wJnF1b3Q7KTsiIGlkPSJvYmplY3QtMCIvPgogIDxyYWRpYWxHcmFkaWVudCBpZD0iU1ZHSURfMl8iIGN4PSI0OS42NyIgY3k9IjQ5Ljk5IiByPSIyNy43OSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMTAuMDQ2NzE2LCAtNi43NjQ5MTQpIj4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiMwNzI1NTQiIG9mZnNldD0iMC41NzQ0Ii8+CiAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMEEzMDVFIiBvZmZzZXQ9IjEiLz4KICA8L3JhZGlhbEdyYWRpZW50PgogIDxwYXRoIGNsYXNzPSJjbHMtNiIgZD0iTSA4Ny44NDcgNDMuNjM1IEMgODcuODQ3IDU2LjkzNSA3Ni42NDcgNjEuOTM1IDczLjY0NyA2NC4xMzUgQyA3MS4yNDcgNjUuODM1IDY1Ljg0NyA2OC41MzUgNjAuMDQ3IDY4LjYzNSBDIDQ2LjE0NyA2OC44MzUgMzIuMTQ3IDU4LjYzNSAzMi4xNDcgNDMuNjM1IEMgMzIuMTQ3IDI5LjQzNSA0NC41NDcgMTUuOTM1IDYwLjA0NyAxNC42MzUgQyA3My40NDcgMTQuNTM1IDg3Ljg0NyAyNy4wMzUgODcuODQ3IDQzLjYzNSBaIi8+CiAgPHBhdGggY2xhc3M9ImNscy03IiBkPSJNIDgwLjY0NyA0My4yMzUgQyA4MC42NDcgNTQuMDM1IDcyLjE0NyA2Mi44MzUgNjAuMDQ3IDYyLjgzNSBDIDQ4Ljg0NyA2Mi44MzUgNDAuMDQ3IDU0LjUzNSAzOS4xNDcgNDMuMjM1IEMgMzkuMTQ3IDM0LjAzNSA0Ni45NDcgMjEuOTM1IDYwLjA0NyAyMS45MzUgQyA3MS40NDcgMjEuOTM1IDgwLjY0NyAzMS41MzUgODAuNjQ3IDQzLjIzNSBaIi8+CiAgPGVsbGlwc2UgY2xhc3M9ImNscy0zIiBjeD0iNTkuOTQ3IiBjeT0iNDMuMjM1IiByeD0iMjAuNiIgcnk9IjIxIi8+CiAgPHBhdGggY2xhc3M9ImNscy0xMCIgZD0iTSA0OC4wNDcgNDIuODM1IEMgNDguMDQ3IDM3LjAzNSA1Mi42NDcgMzAuODM1IDU5LjY0NyAzMC44MzUgQyA2NS42NDcgMzAuODM1IDcxLjc0NyAzNS40MzUgNzEuNzQ3IDQyLjgzNSBDIDcxLjc0NyA0OS4wMzUgNjcuMTQ3IDU0LjYzNSA2MC4wNDcgNTQuNjM1IEMgNTIuNjQ3IDU0LjkzNSA0OC4wNDcgNDkuNzM1IDQ4LjA0NyA0Mi44MzUgWiIvPgogIDxyYWRpYWxHcmFkaWVudCBpZD0iU1ZHSURfNF8iIGN4PSI2MS4yMSIgY3k9IjYxLjU4IiByPSIyNi45IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAwLjk5NDEyOCwgMTAuMDQ2NzE2LCAtNi4zNTEyMDYpIj4KICAgIDxzdG9wIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IHJnYigwLCAxOTQsIDI1NSk7Ii8+CiAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMDIxNTMxIiBvZmZzZXQ9IjEiLz4KICA8L3JhZGlhbEdyYWRpZW50PgogIDxwYXRoIGNsYXNzPSJjbHMtMTEiIGQ9Ik0gNTkuNzQ3IDE2LjQxNCBDIDQ4LjM0NyAxNi40MTQgMzYuMTQ3IDI1LjI2MiAzNC44NDcgMzcuNDkgQyAzMy4xNDcgNDkuNTE5IDQxLjM5IDYzLjY5IDYwLjI5IDYzLjY5IEMgNzIuMzkgNjMuNjkgODcuODQ3IDU0LjQ4OSA4Ny44NDcgNDMuOTUyIEMgODcuODQ3IDMyLjUxOSA3Ny44NDcgMTYuNDE0IDU5Ljc0NyAxNi40MTQgWiIgc3R5bGU9IiIvPgogIDxwYXRoIGNsYXNzPSJjbHMtNCIgZD0iTSA1OS42NDcgMjcuNjM1IEMgNTMuMDQ3IDI3LjYzNSA0NC45NDcgMzIuODM1IDQ0Ljk0NyA0Mi44MzUgQyA0NC45NDcgNDkuOTM1IDQ5LjU0NyA1Ny44MzUgNTkuNjQ3IDU3LjgzNSBDIDY5LjE0NyA1Ny44MzUgNzQuOTQ3IDUwLjYzNSA3NC45NDcgNDIuODM1IEMgNzQuOTQ3IDM0LjkzNSA2Ny45NDcgMjcuNjM1IDU5LjY0NyAyNy42MzUgWiIvPgogIDxwYXRoIGNsYXNzPSJjbHMtNyIgZD0iTSA0OS42NDcgNDIuODM1IEMgNDkuNjQ3IDM4LjEzNSA1My45NDcgMzIuNDM1IDYwLjA0NyAzMi40MzUgQyA2NS40NDcgMzIuNDM1IDY5Ljk0NyAzNi45MzUgNzAuMzQ3IDQyLjgzNSBDIDcwLjM0NyA0OC4xMzUgNjYuNjQ3IDUzLjUzNSA2MC4wNDcgNTMuNTM1IEMgNTMuNDQ3IDUzLjYzNSA0OS42NDcgNDkuMDM1IDQ5LjY0NyA0Mi44MzUgWiIvPgogIDxwYXRoIGNsYXNzPSJjbHMtMyIgZD0iTSA1Mi42NDcgNDMuMjM1IEMgNTIuNjQ3IDM5LjczNSA1Ni4xNDcgMzMuODM1IDYyLjU0NyAzNC41MzUgQyA2NS40NDcgMzQuOTM1IDY2Ljk0NyAzOC4xMzUgNjYuOTQ3IDM5LjkzNSBDIDY3Ljg0NyA0NS44MzUgNjQuMTQ3IDUwLjEzNSA1OS45NDcgNTAuMTM1IEMgNTYuMTQ3IDUwLjEzNSA1Mi42NDcgNDcuODM1IDUyLjY0NyA0My4yMzUgWiIvPgogIDxwYXRoIGNsYXNzPSJjbHMtMTIiIGQ9Im0zOCA1MCIvPgogIDxwYXRoIGNsYXNzPSJjbHMtMTMiIGQ9Im0zOS42IDQ5LjYiLz4KICA8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzVfIiB4MT0iMzYuODUiIHgyPSI1OS42IiB5MT0iMzYuNzUiIHkyPSI1NC42NCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMTAuMDQ2NzE2LCAtNi43NjQ5MTQpIj4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNmZmYiIG9mZnNldD0iMCIvPgogICAgPHN0b3Agc3RvcC1jb2xvcj0iIzAyMTUzMSIgc3RvcC1vcGFjaXR5PSIwIiBvZmZzZXQ9IjEiLz4KICA8L2xpbmVhckdyYWRpZW50PgogIDxwYXRoIGNsYXNzPSJjbHMtMTQiIGQ9Ik0gNTkuNjQ3IDIzLjkzNSBDIDUxLjQ0NyAyMy45MzUgNDQuNTQ3IDI5LjUzNSA0MS43NDcgMzYuMjM1IEMgNDAuNDQ3IDM5LjgzNSA0My42NDcgNDQuMDM1IDQ3LjE0NyA0My4yMzUgQyA1MS4yNDcgNDIuNTM1IDUxLjc0NyAzOC44MzUgNTQuOTQ3IDM2LjYzNSBDIDU3LjE0NyAzNC44MzUgNjAuNDQ3IDMzLjMzNSA2My45NDcgMzQuMDM1IEMgNjcuODQ3IDM0LjYzNSA2Mi41NDcgMjMuOTM1IDU5LjY0NyAyMy45MzUgWiIvPgogIDxlbGxpcHNlIGNsYXNzPSJjbHMtMTUiIGN4PSI1NS45NDciIGN5PSIzOC44MzUiIHJ4PSIyLjEiIHJ5PSIyLjEiLz4KICA8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzZfIiB4MT0iMzEuNTMiIHgyPSI2MC4zNyIgeTE9IjQwLjc5IiB5Mj0iNTUuMzgiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDEwLjA0NjcxNiwgLTYuNzY0OTE0KSI+CiAgICA8c3RvcCBzdG9wLWNvbG9yPSIjMUY0QjdGIiBvZmZzZXQ9IjAiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiMwMjE1MzEiIHN0b3Atb3BhY2l0eT0iMCIgb2Zmc2V0PSIxIi8+CiAgPC9saW5lYXJHcmFkaWVudD4KICA8cGF0aCBjbGFzcz0iY2xzLTE2IiBkPSJNIDU5LjY0NyAyMy45MzUgQyA1My40NDcgMjMuOTM1IDQ2Ljk0NyAyNi43MzUgNDIuMTQ3IDM0LjkzNSBDIDQwLjcxOSAzNy40NjQgMzkuMTI0IDQ1LjEwMSA0Ny4xNDcgNDMuMjM1IEMgNTAuOTQ3IDQyLjgzNSA1MS43NDcgMzguODM1IDU0Ljk0NyAzNi42MzUgQyA1Ny4xNDcgMzQuODM1IDYwLjg0NyAzMy4zMzUgNjMuOTQ3IDM0LjAzNSBDIDcwLjQ0NyAzNC45MzUgNjIuMTQ3IDIzLjkzNSA1OS42NDcgMjMuOTM1IFoiLz4KICA8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzhfIiB4MT0iMjQuNCIgeDI9IjMwLjk1IiB5MT0iNjcuMjQiIHkyPSI5My43OSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgPHN0b3Agc3RvcC1jb2xvcj0iI2ZmZiIgb2Zmc2V0PSIwLjIxOTgiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNDN0Q2RTMiIG9mZnNldD0iMSIvPgogIDwvbGluZWFyR3JhZGllbnQ+CiAgPHBhdGggY2xhc3M9ImNscy0xOSIgZD0ibTMzLjUgNzguOSIvPgogIDxsaW5lYXJHcmFkaWVudCBpZD0iU1ZHSURfOV8iIHgxPSIyNC44NCIgeDI9IjMxLjM5IiB5MT0iNjcuMTMiIHkyPSI5My42OSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgPHN0b3Agc3RvcC1jb2xvcj0iI2ZmZiIgb2Zmc2V0PSIwLjIxOTgiLz4KICAgIDxzdG9wIHN0b3AtY29sb3I9IiNDN0Q2RTMiIG9mZnNldD0iMSIvPgogIDwvbGluZWFyR3JhZGllbnQ+CiAgPHBhdGggY2xhc3M9ImNscy0yMCIgZD0ibTMzLjkgNzguNyIvPgogIDxnIHN0eWxlPSJ0cmFuc2Zvcm0tb3JpZ2luOiA0Ni42MjE2cHggNzQuNTgwNXB4OyIgdHJhbnNmb3JtPSJtYXRyaXgoLTEuMzAxNjU4LCAwLjIzMjY0NSwgLTAuMTY5ODk3LCAtMC45ODU0NjIsIDE3Ljc5NTc4NCwgMi45MTk2OTQpIj4KICAgIDxwYXRoIGNsYXNzPSJjbHMtNyIgZD0iTSAxOC4wNjUgNjcuMDM1IEMgMjAuOTc0IDYzLjEzNCAyOS44MzQgNjMuNDEgMzguMTczIDY0LjA5NSBDIDQyLjM5IDY0LjQ0MiA1MC42NjUgNjguMTQzIDUzLjU5OCA3MS45IEwgNTQuMzY4IDczLjA2MyBDIDU2LjM4OCA3MS44IDU4Ljc5IDcwLjczNiA2Mi4xNTYgNzAuNzAyIEMgNjQuODk1IDcwLjcwMiA2OC41MDEgNzEuNTY3IDcwLjgxIDc0LjA5MyBMIDcxLjYyNiA3NS40MjIgQyA3My4wMiA3NC44ODkgNzQuMzY2IDc0LjM5MSA3Ni43NzEgNzQuMzkxIEMgODAuNzYgNzQuMzkxIDgzLjQ1MyA3Ni40NTEgODMuNzkxIDc3LjYxNiBDIDgzLjgzNiA3Ny44ODEgODMuNTAxIDc4LjE0NyA4My4wMjIgNzguNDQ2IEMgNzYuMjg5IDgyLjYzMyA2Ny45MjQgODUuNjkxIDU2LjM4OCA4NS42OTEgQyA0MS45MTUgODUuNjkxIDM0Ljc4NiA4MC4wMzQgMjkuOTQ0IDc3LjcxNiBDIDI4LjUgNzcuMDI0IDE3LjAyNCA2OC40MzEgMTguMDY1IDY3LjAzNSBaIiBzdHlsZT0iZmlsbDogdXJsKCZxdW90OyNncmFkaWVudC0xJnF1b3Q7KTsgdHJhbnNmb3JtLWJveDogZmlsbC1ib3g7IHRyYW5zZm9ybS1vcmlnaW46IDUwJSA1MCU7IGZpbGwtb3BhY2l0eTogMC4zNzsiLz4KICAgIDxwYXRoIGNsYXNzPSJjbHMtOSIgZD0iTSA1My4xOTUgNzIuNzY4IEMgNTIuOTE4IDcyLjY2NSA1Mi42NTcgNzIuNjg3IDUyLjA3NyA3Mi43MzQgQyA0OS4yNCA3Mi45NjggNDcuMjc0IDc1LjY3MyA0Ni4zMTMgNzguMzU2IEMgNDQuNjExIDc5LjM4NyAzOS43MDUgODIuMDA4IDM5LjQ2NyA4Mi4yODEgQyA0NC41MDggODUuMTA3IDUzLjM5NiA4Ni4wNzYgNjIuMjggODUuMzQ0IEMgNzEuNDI3IDg0LjU4OSA3OC42NDkgODAuNzY3IDg0LjYzMSA3NS4xOTIgQyA4My4wMzQgNzMuNDggODAuMjU4IDcxLjU1NCA3Ni4zMTYgNzEuODggQyA3NS4wMDIgNzEuOTg5IDczLjcxNyA3Mi40MTIgNzIuMzI1IDczLjM1MyBMIDcwLjk1IDcxLjE3OSBDIDY5LjQzNiA2OS4yMDggNjUuOTAzIDY2LjY0IDYxLjY0NSA2Ni45OTEgQyA1Ny45MTIgNjcuMjk4IDU1LjQzMiA2OS41OTkgNTMuMTk1IDcyLjc2OCBaIiBzdHlsZT0ic3Ryb2tlOiBub25lOyBzdHJva2UtbWl0ZXJsaW1pdDogNDsgc3Ryb2tlLXdpZHRoOiAxcHg7IGZpbGw6IHVybCgmcXVvdDsjZ3JhZGllbnQtMiZxdW90Oyk7IHRyYW5zZm9ybS1vcmlnaW46IDYxLjgwM3B4IDc2LjE4MXB4OyBmaWxsLW9wYWNpdHk6IDAuNTc7Ii8+CiAgICA8cGF0aCBjbGFzcz0iY2xzLTkiIGQ9Ik0gMzMuODQyIDYzLjk5NiBDIDMzLjcxNSA2My43NDcgMzMuNTA3IDYzLjU5NyAzMy4wNDcgNjMuMjY1IEMgMzAuNzg5IDYxLjY0MyAyNy4zNDkgNjIuMzY1IDI0LjY2MSA2My43MDcgQyAyMi42NSA2My4zOCAxNy4xMSA2Mi4xODUgMTYuNzM0IDYyLjIzMyBDIDE4LjM1IDY3LjQ2OSAyNC4xNjQgNzMuNzg4IDMxLjIzMiA3OC44NjkgQyAzOC41MDcgODQuMDk4IDQ2LjYzNyA4NS44ODQgNTUuMTQ4IDg1LjYxMyBDIDU1LjIzOCA4My4zNjIgNTQuNjIgODAuMjEgNTEuNDg1IDc3Ljk1NiBDIDUwLjQzOSA3Ny4yMDQgNDkuMTgyIDc2LjcwMSA0Ny40NjQgNzYuNTA1IEwgNDguMDU5IDc0LjA1NyBDIDQ4LjQwMyA3MS42NjggNDcuNzA0IDY3LjU3MiA0NC4zMTcgNjUuMTM4IEMgNDEuMzQ4IDYzLjAwMyAzNy44MjYgNjMuMTA3IDMzLjg0MiA2My45OTYgWiIgc3R5bGU9InN0cm9rZTogbm9uZTsgc3Ryb2tlLW1pdGVybGltaXQ6IDQ7IHN0cm9rZS13aWR0aDogMXB4OyBmaWxsOiB1cmwoJnF1b3Q7I2dyYWRpZW50LTMmcXVvdDspOyB0cmFuc2Zvcm0tb3JpZ2luOiAzNy42NDdweCA3MS45MTJweDsgZmlsbC1vcGFjaXR5OiAwLjM5OyIvPgogIDwvZz4KPC9zdmc+",
      "heightPx": 48,
      "href": "",
      "alt": "CloudLib.EU",
      "lockAspectRatio": true,
      "naturalWidth": 183,
      "naturalHeight": 150
    },
    "brand": {
      "starsText": "★ ★ ★ ★ ★ ★",
      "nameHtml": "<span style=\"font-family:Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#4db8ff;letter-spacing:1px\">Cloud</span><span style=\"font-family:Helvetica,Arial,sans-serif;font-size:20px;color:#a8d8f8;font-weight:700;letter-spacing:1px\">Lib</span><span style=\"font-family:Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#59abf0;letter-spacing:1px\">.EU</span>"
    },
    "personalization": {
      "customFields": [],
      "samples": {
        "name": "Maria Muster",
        "email": "maria.muster@example.eu"
      }
    },
    "exportFileNamePrefix": "CloudLib-Listmonk",
    "legal": {
      "noticeHtml": "Sie erhalten diese E‑Mail, weil Sie im Kontext Ihrer 360°‑Präsenz mit uns in Verbindung stehen. Eine Abmeldung ist jederzeit über den Link im Footer möglich.",
      "companyName": "Take Marco GmbH",
      "companyWebsiteLabel": "cloudlib.eu",
      "companyWebsiteHref": "https://cloudlib.eu",
      "privacyLabel": "Datenschutz",
      "privacyHref": "https://cloudlib.eu/home/privacy",
      "imprintLabel": "Impressum",
      "imprintHref": "https://cloudlib.eu/home/credits",
      "unsubscribeLabel": "Abmelden",
      "viewInBrowserLabel": "Im Browser ansehen"
    }
  },
  "blocks": [
    {
      "id": "bmo8rynqo-1",
      "type": "hero",
      "label": "Die Frage ist ernst gemeint. Jeden Tag tun es Tausende:",
      "headlineHtml": "<em>Wie betritt man Ihren Betrieb, wenn die Tür geschlossen ist?</em>"
    },
    {
      "id": "bmo8rynqo-2",
      "type": "chapter-band",
      "titleHtml": "Eine von beiden Antworten kostet Sie Umsatz"
    },
    {
      "id": "bmo91avmn-1",
      "type": "pull-quote",
      "html": "„Zeigt sich Ihr Betrieb, oder der Ihres Mitbewerbers?\""
    },
    {
      "id": "bmo8rynqo-3",
      "type": "paragraph",
      "html": "Wer seinen Betrieb nicht zeigt, überlässt den ersten Eindruck dem Zufall, oder dem Mitbewerber, der es tut.<br><br><span style=\"color:rgb(212,212,212)\">Niemand bucht ein Hotelzimmer ohne Fotos. Warum sollte jemand Ihr Unternehmen besuchen, ohne es vorher gesehen zu haben?</span>"
    },
    {
      "id": "bmo91hc4d-1",
      "type": "pull-quote",
      "html": "„Lange bevor der Kunde Ihre Tür öffnet, fällt die Entscheidung online.\""
    },
    {
      "id": "bmo8rynqo-5",
      "type": "chapter-band",
      "titleHtml": "Ihre Reichweite. Unser Job."
    },
    {
      "id": "bmo8rynqo-6",
      "type": "paragraph",
      "html": "<span style=\"color:rgb(235,241,250)\"><strong>cloudlib.eu</strong></span> ist kein gewöhnliches Branchenverzeichnis.<br>Es ist die einzige internationale Plattform, die ausschließlich Betriebe mit 360°-Aufnahmen sichtbar macht – und damit der Startpunkt für alles, was Reichweite schafft.<br><br>Über 22.000 Unternehmen in 9 Ländern nutzen <strong>cloudlib.eu</strong> bereits erfolgreich, um ihre Umsätze zu steigern. Denn aus einem Eintrag werden Google Street Views, Werbevideos, Social-Media-Kanäle und messbare Aufmerksamkeit.<br><br><span style=\"font-size:26px\"><em>Sie müssen nicht nach Online-Multiplikatoren suchen; wir bringen Sichtbarkeit direkt zu Ihnen.</em></span>"
    },
    {
      "id": "bmo8rynqo-7",
      "type": "stat-box",
      "number": "22.000+",
      "label": "3D Touren online",
      "geoHtml": "Österreich · Deutschland<br>Schweiz · Südtirol<br>Schweden · Belgien<br>Niederlande · Liechtenstein<br>Luxemburg +++"
    },
    {
      "id": "bmo8rynqo-8",
      "type": "chapter-band",
      "titleHtml": "Was das für Sie bedeutet"
    },
    {
      "id": "bmo8rynqo-9",
      "type": "paragraph",
      "html": "<span style=\"color:rgb(50,187,255)\">Ihre Fotos werden zu virtuellen Rundgängen, und auf Wunsch zu noch viel mehr: Werbevideos, Social-Media-Inhalte und professionelle Online-Auftritte.</span><br><br>Ihre Sichtbarkeit wächst auf einem zweiten, unabhängigen Kanal — <strong>zusätzlich zu Google, nicht statt Google.</strong>"
    },
    {
      "id": "bmo8rynqo-a",
      "type": "benefits-list",
      "items": [
        "Dedizierter Unternehmenseintrag auf cloudlib.eu",
        "Virtuelle Rundgänge aus Ihren bestehenden oder neu erstellten 360°-Aufnahmen",
        "Aufbereitung für Werbevideos und Social-Media-Plattformen",
        "Persönliche Einrichtung durch unser Team — Sie konfigurieren nichts selbst"
      ]
    },
    {
      "id": "bmo8rynqo-b",
      "type": "price-box",
      "badge": "Einführungsangebot  –  50% Rabatt",
      "strike": "Statt €199 netto / Jahr",
      "mainPriceHtml": "<span style=\"font-size:16px;vertical-align:super;padding-right:4px;color:#f5c518\">€</span>99 <span style=\"font-size:16px;font-weight:300;color:#4a6a88\">netto / Jahr</span>",
      "details": "Keine automatische Verlängerung  ·  Keine versteckten Kosten  ·  Jederzeit kündbar",
      "fine": "Dieses Angebot gilt nur für begrenzte Zeit und steht nur einer begrenzten Anzahl von Unternehmen zur Verfügung."
    },
    {
      "id": "bmo8rynqo-c",
      "type": "chapter-band",
      "titleHtml": "Machen Sie sich selbst ein Bild"
    },
    {
      "id": "bmo8rynqo-d",
      "type": "paragraph",
      "html": "Besuchen Sie <strong>cloudlib.eu</strong> und sehen Sie, wie andere Unternehmen bereits präsentiert werden. Suchen Sie nach Branchen oder Regionen — der Eindruck spricht für sich."
    },
    {
      "id": "bmo8rynqo-e",
      "type": "cta-button",
      "text": "3D Portal ansehen",
      "href": "https://www.cloudlib.eu"
    },
    {
      "id": "bmo8rynqo-f",
      "type": "cta-link-list",
      "items": [
        {
          "label": "Termin vereinbaren:",
          "intro": "Wir rufen Sie zurück —",
          "linkText": "Termin buchen",
          "href": "https://cloudlib.eu/home/contact"
        },
        {
          "label": "Direkt antworten:",
          "intro": "Eine kurze Rückmeldung genügt — wir melden uns umgehend",
          "linkText": "",
          "href": ""
        }
      ]
    }
  ]
} as Newsletter;
