import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ChevronRight } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle, faTiktok, faPinterest } from "@fortawesome/free-brands-svg-icons";
import { Link } from "react-router-dom";

export default function Integrations() {
  const channels = [
    {
      name: "Google",
      description: "Google Ads, Analytics e Merchant Center",
      icon: faGoogle,
      iconBg: "bg-white border",
      barColor: "bg-[#4285F4]",
      iconColor: "text-[#4285F4]",
      href: "#",
      connected: false,
      available: false,
    },
    {
      name: "TikTok",
      description: "TikTok Ads e Pixel",
      icon: faTiktok,
      iconBg: "bg-black",
      barColor: "bg-black",
      iconColor: "text-white",
      href: "#",
      connected: false,
      available: false,
    },
    {
      name: "Pinterest",
      description: "Pinterest Ads e Tag",
      icon: faPinterest,
      iconBg: "bg-[#E60023]",
      barColor: "bg-[#E60023]",
      iconColor: "text-white",
      href: "#",
      connected: false,
      available: false,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Canais & Integrações</h1>
        <p className="text-muted-foreground">Conecte sua loja com plataformas de anúncios e marketing</p>
      </div>

      <div className="grid gap-4">
        {channels.map((ch) => (
          <Card key={ch.name} className="overflow-hidden">
            <div className={`h-1 ${ch.barColor}`} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl ${ch.iconBg} flex items-center justify-center`}>
                    <FontAwesomeIcon icon={ch.icon} className={`w-5 h-5 ${ch.iconColor}`} />
                  </div>
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      {ch.name}
                      {ch.connected && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Conectado</Badge>
                      )}
                      {!ch.available && (
                        <Badge variant="outline" className="text-muted-foreground text-xs">Em breve</Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{ch.description}</p>
                  </div>
                </div>
                {ch.available ? (
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={ch.href}><ChevronRight className="h-5 w-5" /></Link>
                  </Button>
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground/30" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Sobre as Integrações</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                As integrações permitem que a Zelpi gerencie seus ativos de marketing de forma automatizada.
                Seus dados são tratados com segurança e você pode revogar o acesso a qualquer momento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
