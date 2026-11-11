import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Code {
  codeId: number;
  codeTypeId: number;
  code_type_name?: string;
  codeTypeName?: string;
  parentId?: number;
  parent_id?: number;
  code: string;
  value: string;
  englishName: string;
  english_name?: string;
}

export interface Address {
  addressId?: number;
  addressType: string;
  associatedTo: string;
  associatedId: number;
  addressLine1: string;
  addressLine2?: string;
  suburb?: string;
  postcode?: string;
  stateId?: number;
  countryId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SystemService {
  private apiUrl = `${environment.apiUrl}/v1/system`;

  private codesSubject = new BehaviorSubject<Code[]>([]);
  public codes$ = this.codesSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadAllCodes(): Observable<Code[]> {
    return this.http.get<Code[]>(`${this.apiUrl}/codes`).pipe(
      tap(codes => this.codesSubject.next(codes))
    );
  }

  getCodesByType(typeId: number): Code[] {
    return this.codesSubject.value.filter(c => c.codeTypeId === typeId);
  }

  getAddresses(associatedTo: string, associatedId: number): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.apiUrl}/address/${associatedTo}/${associatedId}`);
  }

  saveAddress(address: Address): Observable<{ addressId: number }> {
    if (address.addressId) {
      return this.http.put<{ addressId: number }>(`${this.apiUrl}/address/${address.addressId}`, address);
    } else {
      return this.http.post<{ addressId: number }>(`${this.apiUrl}/address`, address);
    }
  }

  getFiles(fileType: string, associatedTo: string, associatedId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/files/${fileType}/${associatedTo}/${associatedId}`);
  }

  uploadFile(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/files`, formData);
  }
}
