/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as _ from 'lodash';
import { filter, switchMap, tap } from 'rxjs/operators';

import { SnackbarService } from '../../../../../services/snackbar.service';
import { ApplicationService } from '../../../../../services/application.service';
import { DialogService } from '../../../../../services/dialog.service';
import { AuthService } from '../../../../../services/auth.service';

@Component({
  selector: 'application-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss'],
})
export class ApplicationGeneralComponent implements OnInit {
  @ViewChild('applicationForm', { static: true }) form: any;
  private domainId: string;
  domain: any;
  application: any;
  applicationOAuthSettings: any = {};
  applicationAdvancedSettings: any = {};
  requestUri: string;
  redirectUri: string;
  logoutRedirectUri: string;
  requestUris: any[] = [];
  redirectUris: any[] = [];
  logoutRedirectUris: any[] = [];
  formChanged = false;
  editMode: boolean;
  deleteMode: boolean;
  renewSecretMode: boolean;
  applicationType: string;
  applicationTypes: any[] = [
    {
      name: 'Web',
      type: 'WEB',
    },
    {
      name: 'Single-Page App',
      type: 'BROWSER',
    },
    {
      name: 'Native',
      type: 'NATIVE',
    },
    {
      name: 'Backend to Backend',
      type: 'SERVICE',
    },
    {
      name: 'Resource Server',
      type: 'RESOURCE_SERVER',
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private snackbarService: SnackbarService,
    private applicationService: ApplicationService,
    private authService: AuthService,
    private dialogService: DialogService,
  ) {}

  ngOnInit() {
    this.domain = this.route.snapshot.data['domain'];
    this.domainId = this.domain.id;
    this.application = this.route.snapshot.data['application'];
    this.applicationType = this.application.type.toUpperCase();
    this.applicationOAuthSettings = this.application.settings == null ? {} : this.application.settings.oauth || {};
    this.applicationAdvancedSettings = this.application.settings == null ? {} : this.application.settings.advanced || {};
    this.applicationOAuthSettings.redirectUris = this.applicationOAuthSettings.redirectUris || [];
    this.applicationOAuthSettings.requestUris = this.applicationOAuthSettings.requestUris || [];
    this.applicationOAuthSettings.singleSignOut = this.applicationOAuthSettings.singleSignOut || false;
    this.applicationOAuthSettings.silentReAuthentication = this.applicationOAuthSettings.silentReAuthentication || false;
    this.application.factors = this.application.factors || [];
    this.redirectUris = _.map(this.applicationOAuthSettings.redirectUris, function (item) {
      return { value: item };
    });
    this.requestUris = _.map(this.applicationOAuthSettings.requestUris, function (item) {
      return { value: item };
    });
    this.logoutRedirectUris = _.map(this.applicationOAuthSettings.postLogoutRedirectUris, function (item) {
      return { value: item };
    });
    this.editMode = this.authService.hasPermissions(['application_settings_update']);
    this.deleteMode = this.authService.hasPermissions(['application_settings_delete']);
    this.renewSecretMode = this.authService.hasPermissions(['application_openid_update']);
    if (!this.domain.uma || !this.domain.uma.enabled) {
      _.remove(this.applicationTypes, { type: 'RESOURCE_SERVER' });
    }
  }

  update() {
    const data: any = {};
    data.name = this.application.name;
    data.description = this.application.description;
    data.settings = {};
    data.settings.oauth = {
      redirectUris: _.map(this.redirectUris, 'value'),
      requestUris: _.map(this.requestUris, 'value'),
      postLogoutRedirectUris: _.map(this.logoutRedirectUris, 'value'),
      singleSignOut: this.applicationOAuthSettings.singleSignOut,
      silentReAuthentication: this.applicationOAuthSettings.silentReAuthentication,
    };
    data.settings.advanced = { skipConsent: this.applicationAdvancedSettings.skipConsent };
    this.applicationService.patch(this.domainId, this.application.id, data).subscribe((response) => {
      this.application = response;
      this.route.snapshot.data['application'] = this.application;
      this.form.reset(this.application);
      this.formChanged = false;
      this.snackbarService.open('Application updated');
    });
  }

  delete(event) {
    event.preventDefault();
    this.dialogService
      .confirm('Delete Application', 'Are you sure you want to delete this application ?')
      .pipe(
        filter((res) => res),
        switchMap(() => this.applicationService.delete(this.domainId, this.application.id)),
        tap(() => {
          this.snackbarService.open('Application deleted');
          this.router.navigate(['/environments', this.domain.referenceId, 'domains', this.domain.hrid, 'applications']);
        }),
      )
      .subscribe();
  }

  renewClientSecret(event) {
    event.preventDefault();
    this.dialogService
      .confirm('Renew Client secret', 'Are you sure you want to renew the client secret ?')
      .pipe(
        filter((res) => res),
        switchMap(() => this.applicationService.renewClientSecret(this.domainId, this.application.id)),
        tap((data) => {
          this.application = data;
          this.snackbarService.open('Client secret updated');
        }),
      )
      .subscribe();
  }

  changeApplicationType() {
    this.dialogService
      .confirm('Change application type', 'Are you sure you want to change the type of the application ?')
      .pipe(
        filter((res) => res),
        switchMap(() => this.applicationService.updateType(this.domainId, this.application.id, this.applicationType)),
        tap((data) => {
          this.application = data;
          this.snackbarService.open('Application type changed');
        }),
        switchMap(() => this.router.navigateByUrl('/dummy', { skipLocationChange: true })),
        switchMap(() =>
          this.router.navigate([
            '/environments',
            this.domain.referenceId,
            'domains',
            this.domain.hrid,
            'applications',
            this.application.id,
          ]),
        ),
      )
      .subscribe();
  }

  addRedirectUris(event) {
    event.preventDefault();
    if (this.redirectUri) {
      const sanitizedUri = this.redirectUri.trim();
      if (!this.redirectUris.some((el) => el.value === sanitizedUri)) {
        this.redirectUris.push({ value: sanitizedUri });
        this.redirectUris = [...this.redirectUris];
        this.redirectUri = null;
        this.formChanged = true;
      } else {
        this.snackbarService.open(`Error : redirect URI "${sanitizedUri}" already exists`);
      }
    }
  }

  addRequestUris(event) {
    event.preventDefault();
    if (this.requestUri) {
      const sanitizedUri = this.requestUri.trim();
      if (!this.requestUris.some((el) => el.value === sanitizedUri)) {
        this.requestUris.push({ value: sanitizedUri });
        this.requestUris = [...this.requestUris];
        this.requestUri = null;
        this.formChanged = true;
      } else {
        this.snackbarService.open(`Error : request URI "${sanitizedUri}" already exists`);
      }
    }
  }

  addLogoutRedirectUris(event) {
    event.preventDefault();
    if (this.logoutRedirectUri) {
      const sanitizedUri = this.logoutRedirectUri.trim();
      if (!this.logoutRedirectUris.some((el) => el.value === sanitizedUri)) {
        this.logoutRedirectUris.push({ value: sanitizedUri });
        this.logoutRedirectUris = [...this.logoutRedirectUris];
        this.logoutRedirectUri = null;
        this.formChanged = true;
      } else {
        this.snackbarService.open(`Error : redirect URI "${sanitizedUri}" already exists`);
      }
    }
  }

  deleteRedirectUris(redirectUri, event) {
    event.preventDefault();
    this.dialogService.confirm('Remove redirect URI', 'Are you sure you want to remove this redirect URI ?').subscribe((res) => {
      if (res) {
        _.remove(this.redirectUris, { value: redirectUri });
        this.redirectUris = [...this.redirectUris];
        this.formChanged = true;
      }
    });
  }

  deleteRequestUris(requestUri, event) {
    event.preventDefault();
    this.dialogService.confirm('Remove request URI', 'Are you sure you want to remove this request URI ?').subscribe((res) => {
      if (res) {
        _.remove(this.requestUris, { value: requestUri });
        this.requestUris = [...this.requestUris];
        this.formChanged = true;
      }
    });
  }

  deleteLogoutRedirectUris(logoutRedirectUri, event) {
    event.preventDefault();
    this.dialogService.confirm('Remove logout redirect URI', 'Are you sure you want to remove this redirect URI ?').subscribe((res) => {
      if (res) {
        _.remove(this.logoutRedirectUris, { value: logoutRedirectUri });
        this.logoutRedirectUris = [...this.logoutRedirectUris];
        this.formChanged = true;
      }
    });
  }

  enableAutoApprove(event) {
    this.applicationAdvancedSettings.skipConsent = event.checked;
    this.formChanged = true;
  }

  enableSingleSignOut(event) {
    this.applicationOAuthSettings.singleSignOut = event.checked;
    this.formChanged = true;
  }

  enableSilentReAuthentication(event) {
    this.applicationOAuthSettings.silentReAuthentication = event.checked;
    this.formChanged = true;
  }

  valueCopied(message: string) {
    this.snackbarService.open(message);
  }

  displaySection(): boolean {
    return this.application.type !== 'service';
  }
}
