import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";

const Layout = ({ children, hideBottomNav = false }: { children: React.ReactNode; hideBottomNav?: boolean }) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className={`flex-1 ${hideBottomNav ? "" : "pb-16"} md:pb-0`}>{children}</main>
      <Footer />
      {!hideBottomNav && <BottomNav />}
    </div>
  );
};

export default Layout;
