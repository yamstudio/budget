import React, { useMemo } from 'react';
import Expenses from './Expenses';
import { Flex, Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  Navigate,
  Link,
  Route,
  Routes,
  useLocation
} from 'react-router-dom';
import Incomes from './Incomes';
const { Header, Footer, Content } = Layout;

const App = () => {
    const navItems: MenuProps['items'] = [
        {
            key: 'expenses',
            label: <Link to='/expenses'>Expenses</Link>
        },
        {
            key: 'incomes',
            label: <Link to='/incomes'>Incomes</Link>
        }
    ];
    const pathname = useLocation().pathname
    const selectedKeys = useMemo(() => {
        if (pathname === '/expenses') {
            return ['expenses'];
        }
        if (pathname === '/incomes') {
            return ['incomes'];
        }
        return [];
    }, [pathname]);
    return (
        <Flex>
            <Layout style={{ height: '100vh', display: 'flex' }}>
                <Header>
                    <Menu
                        theme='dark'
                        mode='horizontal'
                        selectedKeys={selectedKeys}
                        items={navItems}
                        style={{ flex: 1, minWidth: 0 }}
                    />
                </Header>
                <Content style={{ flex: 1, display: 'flex' }}>
                    <Routes>
                        <Route path='/' element={<Navigate to='/expenses'/>}/>
                        <Route path='/expenses' element={<Expenses/>}/>
                        <Route path='/incomes' element={<Incomes/>}/>
                        <Route path='*' element={<Navigate to='/'/>}/>
                    </Routes>
                </Content>
                <Footer></Footer>
            </Layout>
        </Flex>
    );
};

export default App;
