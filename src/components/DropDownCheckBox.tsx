import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"

interface props {
    items: string[];
}

const DropDownCheckBox = ({ items }: props) => {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedItems, setSelectedItems] = useState<string[]>([])

    const toggleItem = (item: string) => {
        setSelectedItems(prev =>
            prev.includes(item)
                ? prev.filter(i => i !== item)
                : [...prev, item]
        )
    }

    return (
        <div className="relative w-64">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                {selectedItems.length > 0 ? selectedItems.join(', ') : 'Sélectionner des éléments'}
                {isOpen ? <ChevronUp className="float-right" /> : <ChevronDown className="float-right" />}
            </button>
            {isOpen && (
                <ul
                    className="absolute w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10"
                    role="listbox"
                    aria-multiselectable="true"
                >
                    {items.map((item) => (
                        <li key={item} className="flex items-center p-2 hover:bg-gray-100">
                            <Checkbox
                                id={item}
                                checked={selectedItems.includes(item)}
                                onCheckedChange={() => toggleItem(item)}
                            />
                            <label htmlFor={item} className="ml-2 cursor-pointer">{item}</label>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default DropDownCheckBox
