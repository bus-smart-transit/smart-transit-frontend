import { createContext, useContext } from 'react';

// 2026-11-06 (decided by the user): only a company admin manages the company's buses, fares, staff, routes and stops;
// other Operators dispatch and only view those. The server refuses the rest (403); the screens hide what it would
// refuse. The Operator dashboard provides the value from the profile (company_users.is_company_admin).
export const CompanyAdminContext = createContext(true);

/** Can the signed-in Operator change buses, fares, staff, routes and stops? */
export const useCanManageCompany = () => useContext(CompanyAdminContext);

export const READ_ONLY_NOTE = 'Only your company admin can change these.';
