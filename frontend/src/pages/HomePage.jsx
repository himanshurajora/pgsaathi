import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  IndianRupee,
  ClipboardList,
  UtensilsCrossed,
  Bell,
  Megaphone,
  Sparkles,
  ShieldCheck,
  BarChart3,
  BedDouble,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Menu,
  X,
  Star,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Property Management",
    desc: "Manage multiple properties with floors, rooms, and beds. Track occupancy in real time with visual indicators.",
  },
  {
    icon: Users,
    title: "Tenant Lifecycle",
    desc: "Onboard tenants with KYC, assign rooms, handle check‑in/out, bed switching, and maintain complete history.",
  },
  {
    icon: IndianRupee,
    title: "Rent & Billing",
    desc: "Generate invoices, record payments, bulk billing, prorated rent calculation, and downloadable PDF receipts.",
  },
  {
    icon: ClipboardList,
    title: "Complaint Tracking",
    desc: "Tenants raise complaints, owners resolve them. SLA tracking, priority levels, and status workflows built in.",
  },
  {
    icon: UtensilsCrossed,
    title: "Mess & Food Management",
    desc: "Configure meal plans, manage food menus, and let tenants view their mess schedule from their dashboard.",
  },
  {
    icon: Sparkles,
    title: "Housekeeping",
    desc: "Schedule and track cleaning & maintenance tasks. Set recurrence, assign staff, and monitor completion.",
  },
  {
    icon: Megaphone,
    title: "Notice Board",
    desc: "Post announcements with priority levels. Pin important notices so tenants never miss an update.",
  },
  {
    icon: Bell,
    title: "Notifications",
    desc: "In‑app notifications with unread counts. Tenants and owners stay informed about every important event.",
  },
  {
    icon: BedDouble,
    title: "Tenant Self‑Service",
    desc: "Tenants get their own dashboard to view dues, pay rent, raise complaints, and check notices independently.",
  },
  {
    icon: ShieldCheck,
    title: "Role‑Based Access",
    desc: "Owner, Warden, and Tenant roles — each sees only what they need. Secure JWT authentication throughout.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "Occupancy rates, revenue summaries, complaint stats, and collection reports — all at a glance.",
  },
  {
    icon: FileText,
    title: "KYC & Documents",
    desc: "Upload identity documents and capture photos during onboarding. Everything stored securely for compliance.",
  },
];

const faqs = [
  {
    q: "Is PGSaathi free to use?",
    a: "We offer a free tier to get started. You can manage your first property at no cost and upgrade as you grow.",
  },
  {
    q: "Can I manage multiple properties?",
    a: "Absolutely! PGSaathi supports unlimited properties, each with its own floors, rooms, and bed configuration.",
  },
  {
    q: "Do tenants need to install anything?",
    a: "No. Tenants simply log in via the web browser on any device — phone, tablet, or laptop. No app install needed.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use JWT‑based authentication, encrypted passwords, and role‑based access control to keep your data safe.",
  },
  {
    q: "Can tenants pay rent through the platform?",
    a: "Tenants can view and track their rent dues. Payment recording is done by the owner after receiving payment offline.",
  },
  {
    q: "Does it work in Hindi?",
    a: "Yes! PGSaathi supports both English and Hindi. You can switch languages anytime from the settings.",
  },
];

const testimonials = [
  {
    name: "Rajesh Sharma",
    role: "PG Owner, Delhi",
    text: "PGSaathi replaced my register books and spreadsheets. I manage 3 properties and 80+ tenants effortlessly now.",
    stars: 5,
  },
  {
    name: "Priya Nair",
    role: "Hostel Warden, Bangalore",
    text: "The complaint tracking and housekeeping features save me hours every week. Highly recommended!",
    stars: 5,
  },
  {
    name: "Amit Patel",
    role: "PG Owner, Pune",
    text: "Finally a tool that understands the Indian PG business. Rent tracking and notice board are game changers.",
    stars: 5,
  },
];

const HomePage = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDFBF7]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* ───── Navbar ───── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>PG</span>
            </div>
            <span className="text-xl font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>PGSaathi</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-stone-600 hover:text-amber-600 transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-sm text-stone-600 hover:text-amber-600 transition-colors font-medium">How It Works</a>
            <a href="#testimonials" className="text-sm text-stone-600 hover:text-amber-600 transition-colors font-medium">Testimonials</a>
            <a href="#faq" className="text-sm text-stone-600 hover:text-amber-600 transition-colors font-medium">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-stone-700 hover:text-amber-600 px-4 py-2 rounded-lg transition-colors">Log In</Link>
            <Link to="/register" className="text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all">Sign Up Free</Link>
          </div>

          {/* Mobile menu toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-stone-700" aria-label="Toggle menu">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-stone-100 px-4 pb-4 space-y-1">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 text-sm text-stone-600 hover:text-amber-600 font-medium">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 text-sm text-stone-600 hover:text-amber-600 font-medium">How It Works</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 text-sm text-stone-600 hover:text-amber-600 font-medium">Testimonials</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 text-sm text-stone-600 hover:text-amber-600 font-medium">FAQ</a>
            <div className="pt-3 flex flex-col gap-2">
              <Link to="/login" className="text-center text-sm font-semibold text-stone-700 border border-stone-200 hover:border-amber-600 px-4 py-2.5 rounded-lg transition-colors">Log In</Link>
              <Link to="/register" className="text-center text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2.5 rounded-lg transition-all">Sign Up Free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 mb-6">
                <Sparkles size={14} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Built for Indian PGs & Hostels</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-stone-900 leading-tight tracking-tight mb-6" style={{ fontFamily: "Manrope, sans-serif" }}>
                Manage Your PG<br />
                <span className="text-amber-600">Like a Pro</span>
              </h1>
              <p className="text-lg text-stone-600 leading-relaxed mb-8 max-w-lg">
                Track tenants, collect rent, handle complaints, manage meals, and run your entire hostel — all from one simple dashboard. No more registers and spreadsheets.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-8 py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Manage Now <ArrowRight size={16} />
                </Link>
                <Link to="/register" className="inline-flex items-center justify-center gap-2 border-2 border-stone-200 hover:border-amber-600 hover:text-amber-600 text-stone-700 font-semibold px-8 py-3.5 rounded-lg transition-all text-sm bg-white" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Sign Up Free
                </Link>
              </div>
              <div className="flex items-center gap-6 mt-8">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-lime-600" />
                  <span className="text-sm text-stone-500">No credit card</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-lime-600" />
                  <span className="text-sm text-stone-500">Free to start</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-lime-600" />
                  <span className="text-sm text-stone-500">Hindi & English</span>
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -top-8 -left-8 w-72 h-72 bg-amber-100 rounded-full blur-3xl opacity-40" />
              <img
                src="https://images.pexels.com/photos/7616700/pexels-photo-7616700.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                alt="Students studying together"
                className="relative rounded-2xl shadow-xl w-full object-cover h-[420px]"
              />
              {/* Floating stat cards */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg border border-stone-100 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Users size={20} className="text-amber-600" /></div>
                <div>
                  <p className="text-xs text-stone-400 font-medium">Active Tenants</p>
                  <p className="text-lg font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>2,400+</p>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg border border-stone-100 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-lime-50 flex items-center justify-center"><Building2 size={20} className="text-lime-600" /></div>
                <div>
                  <p className="text-xs text-stone-400 font-medium">Properties</p>
                  <p className="text-lg font-bold text-stone-900" style={{ fontFamily: "Manrope, sans-serif" }}>150+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Trusted By (Social Proof Strip) ───── */}
      <section className="bg-white border-y border-stone-100 py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">Trusted by PG owners across India</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-stone-300">
            <span className="text-lg font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>Delhi NCR</span>
            <span className="text-lg font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>Bangalore</span>
            <span className="text-lg font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>Pune</span>
            <span className="text-lg font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>Hyderabad</span>
            <span className="text-lg font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>Mumbai</span>
            <span className="text-lg font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>Jaipur</span>
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">Everything You Need</p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              One Platform, Complete Control
            </h2>
            <p className="text-stone-500 text-base max-w-2xl mx-auto leading-relaxed">
              From onboarding your first tenant to generating monthly invoices — PGSaathi handles it all so you can focus on growing your business.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group bg-white border border-stone-200 rounded-xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
                <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
                  <f.icon size={22} className="text-amber-600" />
                </div>
                <h3 className="text-base font-semibold text-stone-900 mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>{f.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section id="how-it-works" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">Simple Setup</p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              Up and Running in Minutes
            </h2>
            <p className="text-stone-500 text-base max-w-xl mx-auto leading-relaxed">
              No complex setup. No training needed. Just sign up and start managing.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Sign Up", desc: "Create your free account in under a minute. No credit card required.", color: "amber" },
              { step: "02", title: "Add Your Property", desc: "Set up your PG with floors, rooms, and beds. Configure rent and mess details.", color: "amber" },
              { step: "03", title: "Start Managing", desc: "Onboard tenants, track rent, handle complaints — all from your dashboard.", color: "lime" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
                  <span className="text-2xl font-bold text-amber-600" style={{ fontFamily: "Manrope, sans-serif" }}>{s.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-stone-900 mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>{s.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/register" className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-8 py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
              Get Started Now <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Testimonials ───── */}
      <section id="testimonials" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">What Owners Say</p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              Loved by PG Owners
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={16} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-stone-600 leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-amber-700" style={{ fontFamily: "Manrope, sans-serif" }}>{t.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{t.name}</p>
                    <p className="text-xs text-stone-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section id="faq" className="py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="border border-stone-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-stone-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-stone-800">{f.q}</span>
                  {openFaq === i ? <ChevronUp size={18} className="text-stone-400 shrink-0" /> : <ChevronDown size={18} className="text-stone-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-stone-500 leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA Banner ───── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-amber-600 rounded-2xl p-10 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              Ready to Simplify Your PG Management?
            </h2>
            <p className="text-amber-100 text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Join hundreds of PG owners who switched from chaos to clarity. Set up in minutes, manage for years.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-amber-700 font-semibold px-8 py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
                Manage Now <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="inline-flex items-center justify-center gap-2 border-2 border-white/40 hover:border-white text-white font-semibold px-8 py-3.5 rounded-lg transition-all text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
                Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="bg-stone-900 text-stone-400 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>PG</span>
                </div>
                <span className="text-xl font-bold text-white" style={{ fontFamily: "Manrope, sans-serif" }}>PGSaathi</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                The all‑in‑one PG & hostel management platform built for Indian property owners. Manage tenants, rent, complaints, and more — effortlessly.
              </p>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#features" className="hover:text-amber-400 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-amber-400 transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-amber-400 transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Contact & Support</h4>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2">
                  <Mail size={14} className="text-amber-500" />
                  <a href="mailto:contact@pgsaathi.online" className="hover:text-amber-400 transition-colors">contact@pgsaathi.online</a>
                </li>
                <li><Link to="/register" className="hover:text-amber-400 transition-colors">Sign Up</Link></li>
                <li><Link to="/login" className="hover:text-amber-400 transition-colors">Log In</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs">&copy; {new Date().getFullYear()} PGSaathi. All rights reserved.</p>
            <p className="text-xs">Made with ❤️ in India</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
