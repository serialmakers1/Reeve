import lovableLogo from "@/assets/lovable-logo.png";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background">
      <h1 className="text-5xl font-bold text-foreground">Hello World</h1>
      <img src={lovableLogo} alt="Lovable logo" className="w-40 h-40 object-contain" />
    </div>
  );
};

export default Index;
