import Image from 'next/image'
import icon from '@/assets/branding/04_drop_app_icon.png'

export default function DropIcon({ className = '', priority = false, size = 22 }: { className?: string; priority?: boolean; size?: number }) {
  return <Image className={className} src={icon} alt="MINIMICAL DROP" priority={priority} width={size} height={size} sizes={`${size}px`} />
}
