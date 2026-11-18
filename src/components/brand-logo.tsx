import Image from "next/image";
import logo from "../../public/brand/alfareej-logo.png";

/** Alfareej wordmark (Figma asset: Cover / S10 Home — logo). */
export function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return <Image src={logo} alt="Alfareej" className={className ?? "h-6 w-auto"} priority={priority} />;
}
