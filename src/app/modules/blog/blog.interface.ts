export type ICreateBlogInput = {
  title: string;
  content: string;
  images?: string[];
  productid?: string | null;
};

export type IUpdateBlogInput = {
  title?: string;
  content?: string;
  images?: string[];
  authorId?: string;
  productid?: string | null;
};