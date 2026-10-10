"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  MessageCircle,
  Search,
  Sparkles,
  ShoppingBag,
  BookOpen,
  Users,
  MoreHorizontal,
} from "lucide-react";
const views = [
  { id: "inbox", label: "Customer conversations", icon: MessageCircle },
  { id: "orders", label: "Orders & customers", icon: ShoppingBag },
  { id: "knowledge", label: "Your business knowledge", icon: BookOpen },
];
export default function MarketingTour() {
  const [view, setView] = useState("inbox");
  return (
    <div className="mk-product" id="product-preview">
      <div className="mk-preview-top">
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>AI Perks · Illustrative product preview</span>
        <span className="mk-preview-live">Your workspace</span>
      </div>
      <div className="mk-preview-body">
        <aside>
          <a className="mk-preview-brand" href="/">
            ai perks<span>✳</span>
          </a>
          <small>WORKSPACE</small>
          {views.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "selected" : ""}
              onClick={() => setView(id)}
              aria-pressed={view === id}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
          <div className="mk-preview-owner">
            <span>SB</span>
            <div>
              Studio Bloom<small>Sample company</small>
            </div>
          </div>
        </aside>
        <div className="mk-preview-content">
          <div className="mk-preview-heading">
            <div>
              <small>LESS BUSY. MORE BUSINESS.</small>
              <h3>
                {view === "inbox"
                  ? "Every hello, in one place."
                  : view === "orders"
                    ? "Keep the next step clear."
                    : "Give your AI the right answers."}
              </h3>
            </div>
            <Search size={19} />
          </div>
          {view === "inbox" ? (
            <div className="mk-inbox-demo">
              <div className="mk-thread-list">
                <div className="mk-demo-thread selected">
                  <b>NA</b>
                  <div>
                    Nadia Ahmed<small>How much is delivery?</small>
                  </div>
                  <i />
                </div>
                <div className="mk-demo-thread">
                  <b>RH</b>
                  <div>
                    Rafi Hasan<small>Thank you for your help!</small>
                  </div>
                </div>
                <div className="mk-demo-thread">
                  <b>SM</b>
                  <div>
                    Sadia Moon<small>Is the olive colour available?</small>
                  </div>
                </div>
                <div className="mk-demo-list-note">
                  <MessageCircle size={18} />
                  <span>A clearer view of every customer.</span>
                </div>
              </div>
              <div className="mk-chat-demo">
                <div className="mk-chat-heading">
                  <span>
                    <b>NA</b> Nadia Ahmed
                  </span>
                  <MoreHorizontal size={19} />
                </div>
                <span className="mk-chat-date">SAMPLE CONVERSATION</span>
                <div className="mk-chat-bubble">
                  I love the everyday tote. How much is delivery?
                </div>
                <div className="mk-ai-draft">
                  <span>
                    <Sparkles size={15} /> AI draft · review before sending
                  </span>
                  <p>
                    Delivery is ৳60. The tote is ৳500, so your total would be
                    ৳560.
                  </p>
                  <small>Based on sample product & delivery information</small>
                </div>
                <div className="mk-chat-compose">
                  <span>A thoughtful answer, ready for your review.</span>
                  <ArrowUpRight size={19} />
                </div>
              </div>
            </div>
          ) : view === "orders" ? (
            <div className="mk-orders-demo">
              <div className="mk-demo-metrics">
                <div>
                  <small>Customer journey</small>
                  <strong>From hello to order</strong>
                </div>
                <div>
                  <small>Your next action</small>
                  <strong>Always in sight</strong>
                </div>
              </div>
              <div className="mk-demo-table">
                <div>
                  <span>Customer</span>
                  <span>Product</span>
                  <span>Status</span>
                </div>
                {[
                  ["Nadia Ahmed", "Everyday tote", "Confirmed"],
                  ["Rafi Hasan", "Linen shirt", "Processing"],
                  ["Sadia Moon", "Canvas pouch", "Pending"],
                ].map(([name, product, status]) => (
                  <div key={name}>
                    <strong>{name}</strong>
                    <span>{product}</span>
                    <em>{status}</em>
                  </div>
                ))}
              </div>
              <p>
                <Users size={17} /> Customer records, leads and orders stay in
                the same workspace.
              </p>
            </div>
          ) : (
            <div className="mk-knowledge-demo">
              <div className="mk-knowledge-item">
                <span>
                  <BookOpen size={22} />
                </span>
                <div>
                  <strong>Delivery & returns</strong>
                  <p>Clear policies for consistent replies.</p>
                </div>
                <Check size={18} />
              </div>
              <div className="mk-knowledge-item">
                <span>
                  <ShoppingBag size={22} />
                </span>
                <div>
                  <strong>Product information</strong>
                  <p>Your prices, details and verified business facts.</p>
                </div>
                <Check size={18} />
              </div>
              <div className="mk-knowledge-note">
                <Sparkles size={22} />
                <h4>Your knowledge. Your tone.</h4>
                <p>
                  AI uses your business reference and conversation history to
                  draft relevant replies. Missing details stay questions, rather
                  than promises.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
