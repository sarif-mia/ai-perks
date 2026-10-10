import type { Kind, Payload } from "./models";
export const sampleData: { kind: Kind; data: Payload; id?: string }[] = [
  {
    kind: "conversations",
    id: "sample-rafi",
    data: {
      name: "Rafi Ahmed",
      channel: "Messenger",
      status: "Waiting",
      customerId: "",
      summary: "Needs help with a size exchange",
    },
  },
  {
    kind: "conversations",
    id: "sample-sadia",
    data: {
      name: "Sadia Rahman",
      channel: "WhatsApp",
      status: "AI",
      customerId: "",
      summary: "Interested in a sage linen shirt",
    },
  },
  {
    kind: "messages",
    data: {
      conversationId: "sample-rafi",
      text: "পাঞ্জাবিটা পেয়েছি, কিন্তু সাইজ একটু ছোট হয়েছে। 44 সাইজ হবে?",
      direction: "in",
      delivery: "Local",
      externalId: "",
    },
  },
  {
    kind: "messages",
    data: {
      conversationId: "sample-sadia",
      text: "Hi! Is the linen shirt available in sage green, size M?",
      direction: "in",
      delivery: "Local",
      externalId: "",
    },
  },
  ...[
    {
      name: "Linen Everyday Shirt",
      sku: "LN-001",
      price: 1490,
      stock: 42,
      category: "Clothing",
      description: "Breathable linen. Available in sage, ivory and navy.",
      status: "Active",
    },
    {
      name: "Ivory Embroidered Panjabi",
      sku: "PN-002",
      price: 2450,
      stock: 18,
      category: "Clothing",
      description: "Premium cotton with embroidered details.",
      status: "Active",
    },
    {
      name: "Everyday Canvas Tote",
      sku: "BG-004",
      price: 650,
      stock: 31,
      category: "Accessories",
      description: "Durable cotton canvas for daily essentials.",
      status: "Active",
    },
  ].map((data) => ({ kind: "products" as Kind, data })),
  ...[
    {
      name: "Sadia Rahman",
      product: "Linen Everyday Shirt",
      quantity: 1,
      amount: 1490,
      status: "Confirmed",
      channel: "Messenger",
      phone: "",
      address: "Dhaka",
    },
    {
      name: "Rafi Ahmed",
      product: "Ivory Embroidered Panjabi",
      quantity: 1,
      amount: 2450,
      status: "Shipped",
      channel: "WhatsApp",
      phone: "",
      address: "Dhaka",
    },
    {
      name: "Mim Akter",
      product: "Everyday Canvas Tote",
      quantity: 2,
      amount: 1300,
      status: "Delivered",
      channel: "Website",
      phone: "",
      address: "Dhaka",
    },
  ].map((data) => ({ kind: "orders" as Kind, data })),
  ...[
    {
      name: "Farhana Islam",
      interest: "Summer collection",
      value: 3500,
      stage: "New",
      priority: "Warm",
    },
    {
      name: "Sajid Khan",
      interest: "Bulk order · 20 shirts",
      value: 29800,
      stage: "Qualified",
      priority: "Hot",
    },
    {
      name: "Nabila Chowdhury",
      interest: "Linen shirt · 2 pieces",
      value: 2980,
      stage: "Contacted",
      priority: "Warm",
    },
    {
      name: "Sadia Rahman",
      interest: "Linen Everyday Shirt",
      value: 1490,
      stage: "Won",
      priority: "Hot",
    },
  ].map((data) => ({
    kind: "leads" as Kind,
    data: { ...data, email: "", phone: "", followup: "" },
  })),
  {
    kind: "knowledge",
    data: {
      name: "Shipping & delivery policy",
      type: "Policy",
      content:
        "Standard delivery takes 2–3 working days within Dhaka and 3–5 working days outside Dhaka. Delivery charge is ৳70 within Dhaka and ৳130 outside Dhaka.",
      status: "Active",
    },
  },
  {
    kind: "knowledge",
    data: {
      name: "Returns & exchanges",
      type: "Policy",
      content:
        "Customers may request a size exchange within 7 days of delivery. Items must be unworn, with tags attached. Contact the team to arrange pickup.",
      status: "Active",
    },
  },
  {
    kind: "replies",
    data: {
      name: "Warm welcome",
      shortcut: "hello",
      content: "Hello! Thanks for getting in touch. How can we help you today?",
      category: "General",
    },
  },
  {
    kind: "replies",
    data: {
      name: "Delivery update",
      shortcut: "shipping",
      content:
        "We’ll check your order and share the latest delivery update with you shortly.",
      category: "Shipping",
    },
  },
  {
    kind: "followups",
    data: {
      name: "Farhana Islam",
      channel: "Messenger",
      message:
        "Hi Farhana! Would you like help choosing from our summer collection?",
      due: "2026-10-12T11:00",
      status: "Scheduled",
      priority: "Warm",
    },
  },
  {
    kind: "broadcasts",
    data: {
      name: "Weekend collection preview",
      channel: "Messenger",
      audience: "Recent customers",
      content:
        "Our new collection is here. Take a look and find your next everyday favorite.",
      scheduled: "",
      status: "Draft",
    },
  },
  {
    kind: "posts",
    data: {
      name: "Meet your new everyday shirt",
      platform: "Instagram",
      content:
        "Easy mornings, breathable linen. Discover our Linen Everyday Shirt.",
      scheduled: "",
      status: "Draft",
    },
  },
  {
    kind: "bookings",
    data: {
      name: "Farhana Islam",
      service: "Personal styling consultation",
      date: "2026-10-12",
      time: "11:00",
      status: "Requested",
      notes: "",
    },
  },
  {
    kind: "channels",
    data: {
      name: "Studio Commerce website",
      platform: "Website",
      externalId: "",
      status: "Sandbox",
      welcome: "Hi there! How can we help?",
    },
  },
  {
    kind: "automations",
    data: {
      name: "Helpful reply suggestions",
      trigger: "Customer question",
      action: "Suggest reply",
      enabled: false,
      instructions: "Use the knowledge base and ask the team if unsure.",
    },
  },
];
