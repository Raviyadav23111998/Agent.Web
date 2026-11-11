import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {

  constructor() {}

  async oauthSignIn() {

    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    const form = document.createElement('form');
    form.setAttribute('method', 'GET');
    form.setAttribute('action', oauth2Endpoint);

    const params: any = {
      'client_id': 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
      'redirect_uri': window.location.origin + '/login',
      'response_type': 'token',
      'scope': 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      'include_granted_scopes': 'true',
      'state': 'pass-through value'
    };

    for (let p in params) {
      let input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', p);
      input.setAttribute('value', params[p]);
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }
}
