import Layout from "@/components/Layout";
import { MessageCircle, Mail, Phone } from "lucide-react";
import RequestCallbackButton from "@/components/RequestCallbackButton";

const Contact = () => {
  return (
    <Layout>
      <div className="bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600 text-center">
            GET IN TOUCH
          </p>
          <h1
            className="text-center mt-3"
            style={{ fontFamily: "'Instrument Serif', serif", fontSize: "40px", color: "#0F172A" }}
          >
            Contact Us
          </h1>
          <p className="text-base text-slate-500 text-center mt-3 max-w-md mx-auto leading-7">
            We're a small team and we read every message. Pick the option that works best for you.
          </p>
          <hr className="border-t border-slate-200 mt-10 mb-12" />

          <div className="grid sm:grid-cols-3 gap-5 mt-4">
            <a
              href="https://wa.me/917899874281?text=Hi%20Reeve%2C%20I%27d%20like%20to%20get%20in%20touch"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-slate-200 bg-[#F8FAFF] p-7 flex flex-col items-start gap-4 hover:-translate-y-0.5 hover:shadow-md transition duration-200 cursor-pointer no-underline"
            >
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-base font-semibold text-slate-900">WhatsApp</p>
              <p className="text-sm text-slate-500 leading-6">
                Chat with us directly. We typically reply within a few hours during business hours.
              </p>
              <span className="inline-flex rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-700">
                Usually replies within a few hours
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-green-700 mt-auto pt-2">
                Open WhatsApp →
              </span>
            </a>

            <a
              href="mailto:support@reeve.in?subject=Enquiry%20%E2%80%94%20Reeve"
              className="rounded-2xl border border-slate-200 bg-[#F8FAFF] p-7 flex flex-col items-start gap-4 hover:-translate-y-0.5 hover:shadow-md transition duration-200 cursor-pointer no-underline"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-base font-semibold text-slate-900">Email</p>
              <p className="text-sm text-slate-500 leading-6">
                Send us an email and we'll get back to you within one business day.
              </p>
              <span className="inline-flex rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                Within 1 business day
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-blue-700 mt-auto pt-2">
                support@reeve.in →
              </span>
            </a>
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFF] p-7 flex flex-col items-start gap-4 hover:-translate-y-0.5 hover:shadow-md transition duration-200">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
                <Phone className="h-6 w-6 text-violet-600" />
              </div>
              <p className="text-base font-semibold text-slate-900">Request a Callback</p>
              <p className="text-sm text-slate-500 leading-6">
                Schedule a call with our team. We'll reach you at your preferred time.
              </p>
              <span className="inline-flex rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-semibold text-violet-700">
                Available 9 AM – 8 PM IST
              </span>
              <RequestCallbackButton
                className="bg-transparent hover:bg-transparent shadow-none border-0 p-0 min-h-0 h-auto text-sm font-semibold text-violet-700 hover:text-violet-800 mt-auto pt-2"
              />
            </div>
          </div>

          <div className="text-center mt-10 text-sm text-slate-400 leading-7">
            <p>Reeve operates Monday to Saturday, 9AM to 7PM IST.</p>
            <p>We do not make unsolicited calls. All outbound contact is in response to your message.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
