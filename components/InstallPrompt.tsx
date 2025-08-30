import React, { useEffect, useState } from "react";
import { Platform, View, Text, TouchableOpacity } from "react-native";

export default function InstallPrompt() {
    const [deferred, setDeferred] = useState<any>(null);
    const [visible, setVisible] = useState(false);
    const [showIOSTip, setShowIOSTip] = useState(false);

    localStorage.setItem("sq_hide_install_banner", "1");

    const hidden = localStorage.getItem("sq_hide_install_banner") === "1";
    if (!hidden) setVisible(true);

    useEffect(() => {
        if (Platform.OS !== "web") return;

        // Android/Desktop: capture the install event
        const onBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferred(e);
            setVisible(true);
        };
        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as any);

        // iOS Safari hint (no event on iOS)
        const ua = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(ua);
        const isStandalone = (window.navigator as any).standalone === true;
        if (isIOS && !isStandalone) {
            setShowIOSTip(true);
            setVisible(true);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as any);
        };
    }, []);

    if (Platform.OS !== "web" || !visible) return null;

    const box = {
        padding: 12,
        margin: 12,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    } as const;

    const btn = {
        backgroundColor: "#6672E7",
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        alignSelf: "flex-start",
        marginTop: 6,
    } as const;

    return (
        <View style={box}>
            {showIOSTip ? (
                <>
                    <Text style={{ color: "#cfd6ff" }}>
                        Add Spark Quotes to your Home Screen:
                        {" "}tap <Text style={{ fontWeight: "700" }}>Share</Text> →{" "}
                        <Text style={{ fontWeight: "700" }}>Add to Home Screen</Text>.
                    </Text>
                </>
            ) : (
                <>
                    <Text style={{ color: "#cfd6ff" }}>
                        Install Spark Quotes for a full-screen experience.
                    </Text>
                    <TouchableOpacity
                        onPress={async () => {
                            if (!deferred) return;
                            deferred.prompt();
                            await deferred.userChoice; // { outcome: 'accepted' | 'dismissed' }
                            setDeferred(null);
                            setVisible(false);
                        }}
                        style={btn}
                    >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>Install app</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}
