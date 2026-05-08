export interface ICreateProduct {
    title: string;
    description: string;
    price: number;
    location: string;
    deliveryCharge: number;
    brand?: string | null;
    warrenty: string;
    images: string[];
    category_name: string;
    date: Date;
  }