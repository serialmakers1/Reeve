import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Building2, Settings } from "lucide-react";

const Index = () => {
  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            A Better Way to Rent in Bangalore
          </h1>
          <p className="mb-10 text-base leading-relaxed text-muted-foreground sm:text-lg">
            REEVE is a property management and rental platform that connects verified tenants with
            property owners in Bangalore. We handle everything — from tenant screening and lease
            agreements to rent collection and property maintenance — so owners get peace of mind and
            tenants get a fair, transparent renting experience. No brokers. No 10-month deposits.
            Just a better way to rent.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={scrollToContact} className="text-base">
              I'm a Tenant
            </Button>
            <Button size="lg" variant="outline" onClick={scrollToContact} className="text-base">
              I'm an Owner
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/40 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-2xl font-bold text-foreground sm:text-3xl">
            How It Works
          </h2>
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-none bg-background shadow-md">
              <CardHeader className="items-center pb-2">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">For Tenants</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                Browse verified listings, apply online, move in with just 1 month deposit. Service
                fee: 7% of monthly rent.
              </CardContent>
            </Card>

            <Card className="border-none bg-background shadow-md">
              <CardHeader className="items-center pb-2">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">For Owners</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                List your property for free. We handle tenant screening, rent collection,
                maintenance, and everything in between. Zero property management cost.
              </CardContent>
            </Card>

            <Card className="border-none bg-background shadow-md sm:col-span-2 lg:col-span-1">
              <CardHeader className="items-center pb-2">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Platform Managed</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-muted-foreground">
                Digital agreements, automated rent collection, maintenance coordination, and
                dedicated support throughout your lease.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 sm:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-2xl font-bold text-foreground sm:text-3xl">Get In Touch</h2>
          <p className="mb-2 text-lg text-muted-foreground">
            Email:{" "}
            <a href="mailto:support@reeve.in" className="text-primary hover:underline">
              support@reeve.in
            </a>
          </p>
          <p className="text-muted-foreground">
            Currently serving Bangalore. Launching soon across major Indian metros.
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
