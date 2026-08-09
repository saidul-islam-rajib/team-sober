export enum AccountStatus {
  /**
   * Registered, but the address has not been proven and no password is set.
   * Cannot sign in. Becomes `Active` when the emailed link is followed.
   */
  Unverified = 'unverified',
  Active = 'active',
}
