"use client";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import logo from "%/lockedincolored.png";
import { useEffect, useState } from "react";
import { showConnect } from "@stacks/connect";
import { userSession } from "@/lib/userSession";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setWalletConnected(true);
    } else {
      router.push("/");
    }
  }, []);

  const disconnectWallet = () => {
    userSession.signUserOut();
    setWalletConnected(false);
  };

  const connectWallet = async () => {
    try {
      showConnect({
        userSession,
        appDetails: {
          name: "BTC Payment Stream",
          icon: window.location.origin + "/favicon.ico",
        },
        onFinish: () => {
          setWalletConnected(true);
        },
        onCancel: () => {
          console.log("Wallet connection cancelled");
        },
      });
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  return (
    <div className="fixed w-full flex flex-row items-center justify-between top-0 h-16 z-30 px-7 bg-white">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Image src={logo} alt={"Teamdr"} height={20} />
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      {walletConnected ? (
        <Button
          variant="outline"
          onClick={disconnectWallet}
          className="text-sm"
        >
          Disconnect Wallet
        </Button>
      ) : (
        <Button variant="outline" onClick={connectWallet}>
          Connect Leather Wallet
        </Button>
      )}
    </div>
  );
}
