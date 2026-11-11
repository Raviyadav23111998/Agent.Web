export const environment = {
  production: false,
  apiUrl: 'http://localhost:8100',
  // Optional SSO. Empty = the button is hidden. Register your own app and
  // add https://<host>/ (Microsoft) or https://<host>/login (Google) as redirect URI.
  msalClientId: '',
  msalAuthority: 'https://login.microsoftonline.com/common',
  googleClientId: ''
};
