import AccountSettings from "@/components/UI/AccountSettings";

function page() {
  return (
    <div className=" relative z-20">
      <span
        className="mb-5 inline-flex items-center gap-2
       rounded-full border border-primary/30 bg-primary/10
        px-4 py-1 text-sm font-semibold text-primary"
      >
        تنظیمات حساب کاربری
      </span>
      <AccountSettings />
    </div>
  );
}

export default page;
