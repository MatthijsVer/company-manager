export interface User {
    id?: string;
    name: string;
    email: string;
    avatar: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    twoFactorEnabled?: boolean;
  }