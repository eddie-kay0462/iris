type PageProps = {
  params: {
    id: string;
  };
};

export default function Page({ params }: PageProps) {
  return <div>Product {params.id}</div>;
}
