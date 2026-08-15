export const CONTACT_INFO = {
  nigeria: {
    country: "Nigeria",
    countryCode: "NG",
    flag: "🇳🇬",
    phone: "+2347063360982",
    phoneDisplay: "+234 706 336 0982",
    phoneRaw: "2347063360982",
    whatsappUrl: "https://wa.me/2347063360982",
    address: "Plot 14 Commercial Avenue, Lagos Trade Fair Complex & Apapa Port Corridor, Lagos State, Nigeria",
    depots: "Lagos (Trade Fair & Apapa), Kano (Bompai), Onitsha (Main Market), Aba (Asa Rd)",
  },
  cameroon: {
    country: "Cameroon",
    countryCode: "CM",
    flag: "🇨🇲",
    phone: "+237677626356",
    phoneDisplay: "+237 677 626 356",
    phoneRaw: "237677626356",
    whatsappUrl: "https://wa.me/237677626356",
    address: "Boulevard de la Liberté, Akwa Commercial Depot & Port Autonome de Douala Corridor, Douala, Cameroon",
    depots: "Douala (Akwa), Yaoundé (Mvan Logistics Hub), Bafoussam, Garoua",
  },
  china: {
    country: "China",
    flag: "🇨🇳",
    desk: "Unit 804, Tower B, International Sourcing Center, Yuexiu District, Guangzhou, China",
    inspectionOffices: "Guangzhou • Yiwu • Shenzhen • Ningbo",
  },
  email: {
    primary: "priscaegesi1980@gmail.com",
    procurement: "priscaegesi1980@gmail.com",
    support: "priscaegesi1980@gmail.com",
    orders: "priscaegesi1980@gmail.com",
  },
  hours: "Monday – Saturday: 8:00 AM – 7:00 PM (WAT / GMT+1)"
};

export function getWhatsAppLink(country: 'nigeria' | 'cameroon', customText?: string): string {
  const phone = country === 'nigeria' ? CONTACT_INFO.nigeria.phoneRaw : CONTACT_INFO.cameroon.phoneRaw;
  const defaultText = "Hello Eagle Excel Ventures, I am interested in bulk wholesale purchase / container import quote from China.";
  const text = encodeURIComponent(customText || defaultText);
  return `https://wa.me/${phone}?text=${text}`;
}
