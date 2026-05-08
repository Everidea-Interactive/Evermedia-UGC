'use client'

import { useId, useState } from 'react'

import { Eye, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'

type PasswordVisibilityInputProps = {
  autoComplete?: string
  buttonClassName?: string
  className: string
  containerClassName?: string
  defaultVisible?: boolean
  id?: string
  name: string
  placeholder?: string
  required?: boolean
}

export function PasswordVisibilityInput({
  autoComplete,
  buttonClassName,
  className,
  containerClassName,
  defaultVisible = false,
  id,
  name,
  placeholder,
  required = false,
}: PasswordVisibilityInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [isVisible, setIsVisible] = useState(defaultVisible)
  const Icon = isVisible ? EyeOff : Eye

  return (
    <div className={cn('auth-input-with-action', containerClassName)}>
      <input
        autoComplete={autoComplete}
        className={className}
        id={inputId}
        name={name}
        placeholder={placeholder}
        required={required}
        type={isVisible ? 'text' : 'password'}
      />
      <button
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        className={cn('auth-input-action', buttonClassName)}
        onClick={() => setIsVisible((current) => !current)}
        type="button"
      >
        <Icon aria-hidden="true" size={18} />
      </button>
    </div>
  )
}
