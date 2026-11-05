export interface CategoryDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'all',
    name: 'সবগুলো',
    icon: 'apps',
    description: 'সকল উপলব্ধি ও শিক্ষা',
    color: '#0D3B2E',
    bgColor: '#EAF3EF',
  },
  {
    id: 'deen',
    name: 'দ্বীন ও আখিরাত',
    icon: 'book',
    description: 'কুরআন, সুন্নাহ, দ্বীনি আলোচনা ও আধ্যাত্মিক জ্ঞান',
    color: '#0D3B2E',
    bgColor: '#EAF3EF',
  },
  {
    id: 'family',
    name: 'দাম্পত্য ও পরিবার',
    icon: 'heart',
    description: 'স্ত্রীর সাথে কথা, মা-বাবা ও পারিবারিক পারস্পরিক শিষ্টাচার',
    color: '#B76E79',
    bgColor: '#FDF0F2',
  },
  {
    id: 'self',
    name: 'আত্মশুদ্ধি ও চরিত্র',
    icon: 'flower',
    description: 'সবর, শোকর, বিনয়, অহংকার বর্জন ও নিজের ভুল সংশোধন',
    color: '#C59B27',
    bgColor: '#FAF5EA',
  },
  {
    id: 'manners',
    name: 'মুয়ামালাত ও ব্যবহার',
    icon: 'people',
    description: 'মানুষের সাথে চলাফেরা, লেনদেন ও সহমর্মিতা',
    color: '#2E7D32',
    bgColor: '#E8F5E9',
  },
  {
    id: 'career',
    name: 'কর্ম ও সমাজ',
    icon: 'briefcase',
    description: 'কাজের জায়গা, সহকর্মী ও সামাজিক অভিজ্ঞতা',
    color: '#1565C0',
    bgColor: '#E3F2FD',
  },
  {
    id: 'general',
    name: 'সাধারণ উপলব্ধি',
    icon: 'bulb',
    description: 'দৈনন্দিন বিবিধ ঘটনা থেকে প্রাপ্ত শিক্ষা',
    color: '#6A1B9A',
    bgColor: '#F3E5F5',
  },
];
