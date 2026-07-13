import type { Locale } from "@/lib/preferences-cookies";

// Flat key → string dictionaries. English is the source of truth; every key
// present here must exist in `hi` too (enforced structurally by the shared
// `Dictionary` type below). This is the demonstrated i18n slice: the app
// shell, navigation, common actions, and page headers. Page-body copy can be
// migrated onto these keys incrementally.
const en = {
  "app.name": "SiteTrack",
  "nav.dashboard": "Dashboard",
  "nav.sites": "Sites",
  "nav.vendors": "Vendors",
  "nav.items": "Items",
  "nav.deliveries": "Deliveries",
  "nav.accounts": "Accounts",
  "nav.payments": "Payments",
  "nav.team": "Team",
  "nav.activity": "Activity",
  "nav.billing": "Billing",
  "action.logout": "Logout",
  "action.platformAdmin": "Platform Admin",
  "common.language": "Language",
  "common.theme": "Theme",
  "common.lightMode": "Light mode",
  "common.darkMode": "Dark mode",
  "dashboard.overview": "Overview",
  "dashboard.subtitle": "Your construction site management at a glance",
  "dashboard.totalBalance": "Total Cash & Bank Balance",
  "team.title": "Team",
  "team.subtitle": "Invite people to this organization and manage their roles",
  "team.members": "Members",
  "team.pendingInvites": "Pending Invitations",
  "team.invite": "Invite Member",
  "role.OWNER": "Owner",
  "role.SUPERVISOR": "Supervisor",
  "role.ACCOUNTANT": "Accountant",
} as const;

export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;

const hi: Dictionary = {
  "app.name": "साइटट्रैक",
  "nav.dashboard": "डैशबोर्ड",
  "nav.sites": "साइटें",
  "nav.vendors": "विक्रेता",
  "nav.items": "सामग्री",
  "nav.deliveries": "डिलीवरी",
  "nav.accounts": "खाते",
  "nav.payments": "भुगतान",
  "nav.team": "टीम",
  "nav.activity": "गतिविधि",
  "nav.billing": "बिलिंग",
  "action.logout": "लॉग आउट",
  "action.platformAdmin": "प्लेटफ़ॉर्म एडमिन",
  "common.language": "भाषा",
  "common.theme": "थीम",
  "common.lightMode": "लाइट मोड",
  "common.darkMode": "डार्क मोड",
  "dashboard.overview": "अवलोकन",
  "dashboard.subtitle": "आपके निर्माण स्थल प्रबंधन का सारांश",
  "dashboard.totalBalance": "कुल नकद और बैंक शेष",
  "team.title": "टीम",
  "team.subtitle": "इस संगठन में लोगों को आमंत्रित करें और उनकी भूमिकाएँ प्रबंधित करें",
  "team.members": "सदस्य",
  "team.pendingInvites": "लंबित आमंत्रण",
  "team.invite": "सदस्य आमंत्रित करें",
  "role.OWNER": "मालिक",
  "role.SUPERVISOR": "पर्यवेक्षक",
  "role.ACCOUNTANT": "लेखाकार",
};

export const dictionaries: Record<Locale, Dictionary> = { en, hi };
