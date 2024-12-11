import Image from "next/image"

export function Logo() {
    return (
        <div className="flex flex-col items-center gap-2">
            <Image
                src="/images/logo.svg"
                alt="Aero Connect"
                width={48}
                height={32}
                className="h-20 w-auto"
            />
            <span className="text-2xl font-light text-gray-700">Aero Connect</span>
        </div>
    )
}

