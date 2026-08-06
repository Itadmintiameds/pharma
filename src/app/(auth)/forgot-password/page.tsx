import Image from "next/image";
import Link from "next/link";
import Button from "@/app/components/common/Button";

const page = () => {
  return (
    <div className="flex h-screen items-center justify-center bg-secondary-50">
      <div className="w-97.75 flex flex-col items-center gap-6 rounded-[14px] border-2 border-pneutral-200 bg-white p-10 text-center">
        <Image
          src="/Login&RegistrationIcons/PharmaIcon.svg"
          alt="TiaMeds"
          width={48}
          height={48}
        />

        <div className="flex flex-col gap-2">
          <div className="text-h5 font-semibold">Feature Coming Soon</div>
          <div className="text-p3 font-normal font-noto-sans text-pneutral-600">
            Password recovery isn't available just yet. We're working on it —
            please check back soon.
          </div>
        </div>

        <Link href="/login" className="w-full">
          <Button variant="primary" fullWidth>
            Back to Login
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default page;