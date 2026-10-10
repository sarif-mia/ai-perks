import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Layers3,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import MarketingTour from "@/components/marketing-tour";
import "./marketing.css";
export const metadata: Metadata = {
  title: "AI Perks — A thoughtful workspace for growing businesses",
  description:
    "Bring customer conversations, AI reply drafts, leads, orders and business knowledge into one company workspace. Request access to AI Perks.",
  alternates: { canonical: "https://ai-perks-two.vercel.app" },
  openGraph: {
    title: "AI Perks — Your business, beautifully in sync.",
    description:
      "Customer conversations, business knowledge and AI assistance. One clear workspace.",
    url: "https://ai-perks-two.vercel.app",
    type: "website",
  },
};
const features = [
  {
    icon: MessageCircle,
    title: "Make every conversation count.",
    text: "Keep customer conversations and reply history together. Draft a response, review it, and keep the next step clear.",
    tag: "CUSTOMER CONVERSATIONS",
  },
  {
    icon: ShoppingBag,
    title: "Follow the business behind the chat.",
    text: "Manage leads, product records and orders without losing the context that started the relationship.",
    tag: "CUSTOMERS & COMMERCE",
  },
  {
    icon: BookOpen,
    title: "Give your AI a reliable reference.",
    text: "Add product details, FAQs and policies. AI drafts use your business knowledge and the conversation to find a relevant answer.",
    tag: "BUSINESS KNOWLEDGE",
  },
];
const faqs = [
  [
    "How do I start?",
    "Request a company workspace with your name, business name, email and password. Once a platform administrator approves your registration, you can sign in and set up your workspace.",
  ],
  [
    "Does AI send messages automatically?",
    "AI replies currently appear as drafts for you to review. You stay in control of what is saved or sent. Live Messenger delivery requires an approved, configured Facebook Page connection; a saved reply does not mean an external message was sent.",
  ],
  [
    "Can AI reply in Bangla?",
    "The assistant is instructed to match the customer’s language, including Bangla, and use the conversation history and your business reference. Review factual details before sending.",
  ],
  [
    "Is my company separate from other companies?",
    "Regular accounts can access their own company workspace. The platform Super Admin manages approvals and company access and can inspect workspaces for administration.",
  ],
  [
    "What does it cost?",
    "Public subscription pricing and online checkout are not available yet. Contact us to discuss your workspace. AI providers have their own quotas and terms; free-tier access is quota limited.",
  ],
  [
    "Can I connect Facebook right away?",
    "A Facebook Page and Meta developer configuration are required for Messenger. Contact us for assisted setup. Facebook social sign-in and self-service Page onboarding are not available yet.",
  ],
];
export default function Home() {
  return (
    <div className="mk-page">
      <a className="mk-skip" href="#main-content">
        Skip to content
      </a>
      <header className="mk-nav">
        <a className="mk-logo" href="/" aria-label="AI Perks home">
          ai perks<span>✳</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href="#access">Access</a>
          <a href="#faq">FAQs</a>
        </nav>
        <div className="mk-nav-actions">
          <a href="/login">
            Sign in <ArrowUpRight size={15} />
          </a>
          <a className="mk-button small" href="/signup">
            Get started <ArrowRight size={15} />
          </a>
        </div>
        <details className="mk-mobile-nav">
          <summary aria-label="Open navigation">
            <Layers3 size={23} />
          </summary>
          <nav aria-label="Mobile navigation">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#access">Access</a>
            <a href="#faq">FAQs</a>
            <a href="/login">Sign in</a>
            <a href="/signup">Request a workspace</a>
          </nav>
        </details>
      </header>
      <main id="main-content">
        <section className="mk-hero">
          <div className="mk-eyebrow">
            <span /> A LITTLE LESS BUSY. A LOT MORE BUSINESS.
          </div>
          <h1>
            Your business,
            <br />
            beautifully{" "}
            <span>
              in sync.
              <svg viewBox="0 0 290 17" aria-hidden="true">
                <path d="M3 12C69 0 187 0 286 9" />
              </svg>
            </span>
          </h1>
          <p>
            Every conversation. Every customer. Every next step.
            <br className="mk-desktop-break" /> One thoughtful workspace for the
            people behind the business.
          </p>
          <div className="mk-hero-actions">
            <a className="mk-button" href="/signup">
              Make room for growth <ArrowUpRight size={19} />
            </a>
            <a className="mk-text-link" href="#product-preview">
              Take a closer look <ArrowRight size={17} />
            </a>
          </div>
          <div className="mk-hero-note">
            <ShieldCheck size={15} /> Company access reviewed by a platform
            administrator.
          </div>
          <div className="mk-hero-product">
            <div className="mk-float-note">
              <Sparkles size={18} />
              <span>
                Less context switching.
                <br />
                <strong>More thoughtful replies.</strong>
              </span>
            </div>
            <MarketingTour />
          </div>
        </section>
        <div
          className="mk-capability-strip"
          aria-label="Workspace capabilities"
        >
          {[
            [MessageCircle, "Conversations"],
            [Sparkles, "AI reply drafts"],
            [Users, "Leads & customers"],
            [ShoppingBag, "Orders & products"],
            [BookOpen, "Knowledge"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof MessageCircle;
            return (
              <span key={String(label)}>
                <I size={18} />
                {String(label)}
              </span>
            );
          })}
        </div>
        <section className="mk-section" id="product">
          <div className="mk-section-heading">
            <div>
              <span className="mk-kicker">A GOOD PLACE TO GROW</span>
              <h2>
                A little less scattered.
                <br />A lot more connected.
              </h2>
            </div>
            <p>
              When the everyday work lives together,
              <br className="mk-desktop-break" /> you have more room for the
              work that matters.
            </p>
          </div>
          <div className="mk-feature-grid">
            {features.map(({ icon: Icon, title, text, tag }, index) => (
              <article key={title} className="mk-feature">
                <div className="mk-feature-top">
                  <span>
                    <Icon size={24} />
                  </span>
                  <small>0{index + 1}</small>
                </div>
                <span className="mk-kicker">{tag}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <a href={index === 2 ? "#ai-assistant" : "#product-preview"}>
                  {index === 2
                    ? "Meet your assistant"
                    : "Explore the workspace"}
                  <ArrowUpRight size={17} />
                </a>
              </article>
            ))}
          </div>
        </section>
        <section className="mk-ai-section" id="ai-assistant">
          <div className="mk-ai-visual">
            <div className="mk-ai-orbit">
              <Sparkles size={37} />
            </div>
            <span className="mk-ai-source one">
              <BookOpen size={17} /> Your policies
            </span>
            <span className="mk-ai-source two">
              <MessageCircle size={17} /> Conversation history
            </span>
            <span className="mk-ai-source three">
              <ShoppingBag size={17} /> Product facts
            </span>
            <div className="mk-ai-output">
              <span>
                <Sparkles size={15} /> A useful draft, with context.
              </span>
              <p>“তাহলে ডেলিভারি সহ মোট কত?”</p>
              <div>
                <Check size={15} /> Match the customer’s language
              </div>
              <div>
                <Check size={15} /> Use your verified reference
              </div>
              <div>
                <Check size={15} /> Keep a person in control
              </div>
            </div>
          </div>
          <div className="mk-ai-copy">
            <span className="mk-kicker">INTELLIGENCE, WITH A HUMAN TOUCH</span>
            <h2>
              An assistant that
              <br />
              starts with <em>your</em> business.
            </h2>
            <p>
              Useful replies begin with context. Your assistant brings the
              customer conversation and your business knowledge together, so you
              can spend less time starting from scratch.
            </p>
            <ul>
              <li>
                <Check size={17} /> Draft replies in the customer’s language.
              </li>
              <li>
                <Check size={17} /> Reference the conversation, products and
                policies.
              </li>
              <li>
                <Check size={17} /> Review the answer before saving or sending.
              </li>
            </ul>
            <a className="mk-text-link" href="/signup">
              Build your business knowledge <ArrowRight size={17} />
            </a>
            <small>
              AI can make mistakes. Provider quotas and data-use terms apply.
            </small>
          </div>
        </section>
        <section className="mk-section mk-workflow" id="how-it-works">
          <div className="mk-centered-heading">
            <span className="mk-kicker">A CALMER WAY TO GET STARTED</span>
            <h2>
              From a new workspace
              <br />
              to a better working day.
            </h2>
            <p>
              A clear beginning, with access and setup kept in your control.
            </p>
          </div>
          <div className="mk-steps">
            {[
              [
                "01",
                "Request your workspace",
                "Register your company and owner account. Your request goes to the platform administrator.",
              ],
              [
                "02",
                "Get approved & make it yours",
                "Sign in after approval. Add your business details, products and answers customers need.",
              ],
              [
                "03",
                "Bring the work together",
                "Manage conversations, leads and orders. Test AI drafts, then review each reply.",
              ],
            ].map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="mk-security-note">
            <ShieldCheck size={25} />
            <div>
              <strong>A workspace with clear boundaries.</strong>
              <p>
                Company data is isolated for regular accounts. Super Admin
                controls approval, suspension and account support.
              </p>
            </div>
          </div>
        </section>
        <section className="mk-access-section" id="access">
          <div>
            <span className="mk-kicker">ROOM FOR YOUR NEXT CHAPTER</span>
            <h2>
              Start with the workspace.
              <br />
              Grow at your own pace.
            </h2>
            <p>
              For business owners who want customer conversations, operations
              and assistance to feel connected.
            </p>
            <a
              className="mk-text-link"
              href="mailto:sarifmia.ofc@gmail.com?subject=AI%20Perks%20workspace%20enquiry"
            >
              Talk to us about your business <ArrowUpRight size={17} />
            </a>
          </div>
          <article className="mk-access-card">
            <div className="mk-access-card-head">
              <span>
                <Workflow size={24} />
              </span>
              <small>COMPANY WORKSPACE</small>
            </div>
            <h3>
              One business.
              <br />
              One good home for its work.
            </h3>
            <ul>
              {[
                "Customer conversations & reply history",
                "AI drafts with your business knowledge",
                "Leads, orders & product records",
                "Activity and business analytics",
                "Company access managed by an administrator",
              ].map((t) => (
                <li key={t}>
                  <Check size={17} />
                  {t}
                </li>
              ))}
            </ul>
            <a className="mk-button" href="/signup">
              Request a company workspace <ArrowRight size={18} />
            </a>
            <p>
              Approval required. Pricing is discussed directly; online checkout
              is not available.
            </p>
          </article>
        </section>
        <section className="mk-section mk-faq" id="faq">
          <div>
            <span className="mk-kicker">A FEW GOOD QUESTIONS</span>
            <h2>
              Before your
              <br />
              next chapter.
            </h2>
            <p>
              Still wondering about something?
              <br />
              <a href="mailto:sarifmia.ofc@gmail.com">
                We’re an email away. <ArrowUpRight size={15} />
              </a>
            </p>
          </div>
          <div>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="mk-final-cta">
          <span className="mk-kicker">LESS FRICTION. MORE POSSIBILITY.</span>
          <h2>
            Make space for
            <br />a better working day.
          </h2>
          <a className="mk-button" href="/signup">
            Let’s bring it together <ArrowUpRight size={19} />
          </a>
          <p>Your business, beautifully in sync.</p>
        </section>
      </main>
      <footer className="mk-footer">
        <div>
          <a className="mk-logo" href="/">
            ai perks<span>✳</span>
          </a>
          <p>Made for the people behind the business.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#product">Product</a>
          <a href="/login">Sign in</a>
          <a href="mailto:sarifmia.ofc@gmail.com">Contact</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
        <small>© {new Date().getFullYear()} AI Perks</small>
      </footer>
    </div>
  );
}
