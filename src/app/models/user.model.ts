export interface UserSummary {
  userId: number;
  userCode?: string;
  name?: string;
  email?: string;
  roleName?: string;
  isActive?: boolean;
}

export interface UserRequest {
  userId?: number;
  userCode: string;
  email: string;
  fullName: string;
  mobile?: string;
  roleId?: number;
  isActive: boolean;
  password?: string;
  avatarUrl?: string;
  platform?: string;
}

export interface UserByIdResponse {
  userId: number;
  userCode: string;
  email: string;
  fullName: string;
  mobile?: string;
  avatarUrl?: string;
  roleId: number;
  roleName?: string;
  isActive: boolean;
  isBlocked: boolean;
  platform?: string;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  created?: UserSummary;
  updated?: UserSummary;
}

export interface UsersListItem {
  userId: number;
  userCode: string;
  email: string;
  fullName: string;
  roleName?: string;
  isActive: boolean;
  isBlocked: boolean;
  platform?: string;
  createdByName?: string;
  createdAt?: Date;
  updatedByName?: string;
  updatedAt?: Date;
}

export interface UsersPagedResponse {
  total: number;
  data: UsersListItem[];
}

export interface RoleItem {
  role_id: number;
  role_name: string;
  role_key: string;
}
