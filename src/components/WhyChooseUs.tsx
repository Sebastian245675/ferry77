import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Package, Clock, Shield, Star } from "lucide-react";

const features = [
	{
		icon: Package,
		title: "Envía Cualquier Cosa",
		description:
			"Desde documentos hasta muebles, conectamos con transportistas especializados.",
		color: "bg-blue-500",
	},
	{
		icon: Clock,
		title: "Rápido y Confiable",
		description: "Cotizaciones en minutos, entregas puntuales garantizadas.",
		color: "bg-green-500",
	},
	{
		icon: Shield,
		title: "100% Seguro",
		description: "Todos nuestros transportistas están verificados y asegurados.",
		color: "bg-purple-500",
	},
	{
		icon: Star,
		title: "Mejor Precio",
		description:
			"Compara múltiples cotizaciones y elige la que mejor se adapte.",
		color: "bg-yellow-500",
	},
];

const WhyChooseUs = () => {
	const [ref, inView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});

	return (
		<motion.section
			ref={ref}
			initial={{ opacity: 0, y: 50 }}
			animate={inView ? { opacity: 1, y: 0 } : {}}
			transition={{ duration: 0.8 }}
			className="py-16 bg-gray-50"
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<motion.div
					className="text-center mb-12"
					initial={{ opacity: 0, y: 20 }}
					animate={inView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.8, delay: 0.2 }}
				>
					<h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
						¿Por qué elegirnos?
					</h2>
					<p className="text-lg text-gray-600">
						Beneficios clave de nuestra plataforma de transporte
					</p>
				</motion.div>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
					{features.map((feature, index) => (
						<motion.div
							key={index}
							className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
							initial={{ opacity: 0, y: 20 }}
							animate={inView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.5, delay: 0.2 * index }}
						>
							<div
								className={`w-16 h-16 ${feature.color} rounded-full flex items-center justify-center mx-auto mb-4`}
							>
								<feature.icon className="w-8 h-8 text-white" />
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-2">
								{feature.title}
							</h3>
							<p className="text-gray-600">{feature.description}</p>
						</motion.div>
					))}
				</div>
			</div>
		</motion.section>
	);
};

export default WhyChooseUs;

