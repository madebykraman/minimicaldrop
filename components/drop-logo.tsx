import Image from 'next/image'
import logo from '@/assets/branding/01_drop_main_logo.png'

export default function DropLogo({ className = '', priority = false }: { className?: string; priority?: boolean }) {
  return <Image className={className} src={logo} alt="MINIMICAL DROP" priority={priority} sizes="(max-width: 700px) 150px, 190px" />
}
