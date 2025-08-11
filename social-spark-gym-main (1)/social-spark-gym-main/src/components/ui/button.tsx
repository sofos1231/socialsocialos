import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        // Tier 1: Primary actions (Purple - Level/Progress)
        default: "btn-tier-1",
        
        // Tier 2: Secondary actions (Orange - XP/Streak) 
        secondary: "btn-tier-2",
        
        // Tier 3: Tertiary actions (Neutral)
        outline: "btn-tier-3",
        
        // Semantic variants
        success: "btn-success",
        destructive: "btn-destructive",
        
        // Utility variants
        ghost: "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline font-medium transition-all duration-200",
      },
      size: {
        default: "px-5 py-3 text-base",
        sm: "px-4 py-2 text-sm rounded-lg",
        lg: "px-6 py-4 text-lg rounded-xl",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
