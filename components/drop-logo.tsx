import Image from 'next/image'
import logo from '@/assets/branding/01_drop_main_logo.png'

export default function DropLogo({ className = '', priority = false, width = 190 }: { className?: string; priority?: boolean; width?: number }) {
  return <Image className={className} src={logo} alt="MINIMICAL DROP" priority={priority} width={width} height={Math.round(width * logo.height / logo.width)} sizes="(max-width: 700px) 150px, 190px" />
}
