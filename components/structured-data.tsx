export function StructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EntertainmentBusiness",
    name: "Creative Gaming Entertainment (CGE)",
    description:
      "Premium gaming lounge on Bonny Island, Nigeria. PS4, PS5, VR gaming, esports tournaments, and community hub.",
    url: "https://cge.ng",
    telephone: "+234-XXX-XXXX",
    email: "info@cge.ng",
    address: {
      "@type": "PostalAddress",
      streetAddress: "1 IT William Street, Akiama",
      addressLocality: "Bonny Island",
      addressRegion: "Rivers State",
      addressCountry: "NG",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 4.4266,
      longitude: 7.1686,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "12:00",
        closes: "22:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "14:00",
        closes: "20:00",
      },
    ],
    priceRange: "₦1500 - ₦5000",
    image: "https://cge.ng/cge-logo.png",
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
