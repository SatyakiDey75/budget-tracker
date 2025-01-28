"use client";

import React from "react";
import Logo from "./logo";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "./ui/button";
import { UserButton } from "@clerk/nextjs";
import { ThemeSwitcherBtn } from "./ThemeSwitcherBtn";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Menu } from "lucide-react";

export default function Navbar() {
    return (
        <>
            <DesktopNavbar />
            <MobileNavbar />
        </>
    );
}

const items = [
    {label: "Dashboard", link: "/"},
    {label: "Transactions", link: "/transactions"},
    {label: "Manage", link: "/manage"},
]

function DesktopNavbar() {
    return (
        <div className="hidden border-separate border-b bg-background md:block">
            <nav className="container flex items-center justify-between px-8">
                <div className="flex h-[80px] min-h-[60px] items-center gap-x-4">
                    <Logo />
                    <div className="flex h-full">
                        {items.map((item) => (
                            <NavbarItem key={item.label} label={item.label} link={item.link} />
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeSwitcherBtn />
                    <UserButton afterSignOutUrl="/sign-in" />
                </div>
            </nav>
        </div>
    )
}

function MobileNavbar() {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="block border-separate md:hidden bg-background">
            <nav className="container items-center justify-between flex px-8">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu />
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[400px] sm:w-[540px]" side="left">
                        <Logo />
                        <div className="flex flex-col gap-1 pt-4">
                            {items.map(item => <NavbarItem 
                            key={item.label} label={item.label} link={item.link} />)}
                        </div>
                    </SheetContent>
                </Sheet>
            </nav>
        </div>
    )
}

function NavbarItem({label, link}: {label: string, link: string}) {
    const pathName = usePathname();
    const isActive = pathName === link; 
    return (
        <div className="relative flex items-center">
            <Link href={link} className={cn(
                buttonVariants({variant: "ghost"}),
                "w-full justify-between md:justify-center text-lg text-muted-foreground hover:text-foreground font-weight-700",
                isActive && "text-foreground"
            )}>{label}</Link>
            {
                isActive && (
                    <div className="absolute -bottom-[2px] left-1/2 hidden h-[2px] w-[80%] -translate-x-1/2 rounded-xl bg-foreground md:block"></div>
                )
            }
        </div>
    )
}