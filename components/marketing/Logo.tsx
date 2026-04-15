import Image from "next/image"

type Props = {
  size?: "sm" | "md" | "lg"
  className?: string
}

const heights: Record<NonNullable<Props["size"]>, number> = {
  sm: 48,
  md: 62,
  lg: 80,
}

export function Logo({ size = "md", className = "" }: Props) {
  const h = heights[size]

  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src="/logo_with_text.png"
        alt="LektieRo"
        width={h}
        height={h}
        priority
      />
    </span>
  )
}
