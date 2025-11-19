import React from 'react';
import { ClassicPreset } from 'rete';

/**
 * 드롭다운 선택을 위한 커스텀 Rete Control
 */
export class SelectControl extends ClassicPreset.Control {
    public value: string;
    public options: Array<{ value: string; label: string }>;
    public onChange?: (value: string) => void;

    constructor(
        options: Array<{ value: string; label: string }>,
        initial?: string,
        onChange?: (value: string) => void
    ) {
        super();
        this.options = options;
        this.value = initial || options[0]?.value || '';
        this.onChange = onChange;
    }

    setValue(val: string) {
        this.value = val;
        if (this.onChange) {
            this.onChange(val);
        }
    }
}

/**
 * SelectControl을 렌더링하는 React 컴포넌트
 */
export function SelectControlComponent(props: { data: SelectControl }) {
    const { data } = props;
    const [value, setValue] = React.useState(data.value);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        data.setValue(newValue);
        // onChange 콜백에서 area.update()가 호출됨
    };

    return (
        <select
            value={value}
            onChange={handleChange}
            className="nodrag w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:bg-neutral-750 transition-colors cursor-pointer"
            style={{
                minWidth: '150px',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
            }}
        >
            {data.options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
