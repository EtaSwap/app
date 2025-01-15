import {Modal, Popover, Radio} from "antd";
import {ethers} from "ethers";


export function SlippageModal({handleSlippage, slippage, isOpen, setIsOpen}: any) {
    return (
        <Modal
            open={isOpen}
            footer={null}
            onCancel={() => {
                setIsOpen(false)
            }}
            title='Settings'
            width='440px'
            wrapClassName='modal__wrapper'
        >
            <div className='modal'>
                <div className='modal__subtitle'>
                    Slippage Tolerance&nbsp;
                    <Popover
                        trigger='hover'
                        placement='right'
                        content='If prices will change on more then provided percent during the swap - the transaction will be reverted.'
                    >
                        <span className="swap__tooltip">
                            <svg className="swap__question" viewBox="0 0 20 20">
                                <use href="#icon--question" xlinkHref="#icon--question"></use>
                            </svg>
                        </span>
                    </Popover>
                </div>
                <div className='modal__slippage'>
                    <Radio.Group onChange={handleSlippage} value={slippage}>
                        <Radio.Button value={0.5}>0.5%</Radio.Button>
                        <Radio.Button value={1}>1%</Radio.Button>
                        <Radio.Button value={2}>2%</Radio.Button>
                        <Radio.Button value={4}>4%</Radio.Button>
                    </Radio.Group>
                </div>
            </div>
        </Modal>
    )
}
