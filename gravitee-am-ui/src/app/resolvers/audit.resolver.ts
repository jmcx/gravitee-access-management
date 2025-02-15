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
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

import { AuditService } from '../services/audit.service';
import { OrganizationService } from '../services/organization.service';

@Injectable()
export class AuditResolver implements Resolve<any> {
  constructor(private auditService: AuditService, private organizationService: OrganizationService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> | Promise<any> | any {
    const auditId = route.paramMap.get('auditId');
    if (state.url.startsWith('/settings')) {
      return this.organizationService.audit(auditId);
    }
    const domainId = route.parent.data['domain'].id;
    return this.auditService.get(domainId, auditId);
  }
}
